use std::cell::RefCell;
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, AtomicPtr, Ordering};

use muda::{CheckMenuItem, ContextMenu, Menu, MenuItem, PredefinedMenuItem};
use objc2::ffi::class_addMethod;
use objc2::runtime::{AnyClass, AnyObject, Imp, Sel};
use objc2::{sel, MainThreadMarker};
use objc2_app_kit::NSApplication;

use super::dock_menu::{self, DockMenuView, ID_NEXT, ID_PREVIOUS, ID_SHUFFLE, ID_TITLE, ID_TOGGLE};

struct DockMenu {
    menu: Menu,
    title: MenuItem,
    toggle: MenuItem,
    next: MenuItem,
    previous: MenuItem,
    shuffle: CheckMenuItem,
}

thread_local! {
    static DOCK_MENU: RefCell<Option<DockMenu>> = const { RefCell::new(None) };
}

static AVAILABLE: AtomicBool = AtomicBool::new(false);
static INSTALL_STARTED: AtomicBool = AtomicBool::new(false);
static NS_MENU: AtomicPtr<c_void> = AtomicPtr::new(std::ptr::null_mut());

type DockMenuImp = extern "C-unwind" fn(*mut AnyObject, Sel, *mut AnyObject) -> *mut AnyObject;

pub fn init(app: &tauri::AppHandle) {
    // The menu itself is installed lazily on the first state push (see apply): no state means
    // nothing to show, and the feature-flagged frontend never pushes state when disabled.
    app.on_menu_event(|app, event| dock_menu::handle_menu_event(app, event.id().as_ref()));
}

fn init_on_main_thread() {
    let view = dock_menu::current_view();
    log::info!("[player::dock_menu] Building Dock menu (title='{}', transport_enabled={})", view.title, view.transport_enabled);
    let dock = match build_menu(&view) {
        Ok(dock) => dock,
        Err(message) => {
            log::error!("[player::dock_menu] Dock menu build failed; continuing without it: {}", message);
            return;
        }
    };
    NS_MENU.store(dock.menu.ns_menu(), Ordering::Release);
    DOCK_MENU.with(|cell| *cell.borrow_mut() = Some(dock));
    match install_dock_menu_method() {
        Ok(class_name) => {
            AVAILABLE.store(true, Ordering::SeqCst);
            log::info!("[player::dock_menu] Dock menu installed on delegate class {}", class_name);
        }
        Err(message) => log::error!("[player::dock_menu] Dock menu unavailable; continuing without it: {}", message),
    }
}

fn build_menu(view: &DockMenuView) -> Result<DockMenu, String> {
    let title = MenuItem::with_id(ID_TITLE, &view.title, false, None);
    let toggle = MenuItem::with_id(ID_TOGGLE, &view.toggle_label, view.transport_enabled, None);
    let next = MenuItem::with_id(ID_NEXT, &view.next_label, view.transport_enabled, None);
    let previous = MenuItem::with_id(ID_PREVIOUS, &view.previous_label, view.transport_enabled, None);
    let shuffle = CheckMenuItem::with_id(ID_SHUFFLE, &view.shuffle_label, view.transport_enabled, view.shuffle_checked, None);
    let separator = PredefinedMenuItem::separator();
    let menu = Menu::with_items(&[&title, &toggle, &next, &previous, &separator, &shuffle]).map_err(|e| format!("Menu::with_items failed: {e}"))?;
    Ok(DockMenu { menu, title, toggle, next, previous, shuffle })
}

extern "C-unwind" fn application_dock_menu(_this: *mut AnyObject, _cmd: Sel, _sender: *mut AnyObject) -> *mut AnyObject {
    let menu = NS_MENU.load(Ordering::Acquire);
    log::debug!("[player::dock_menu] applicationDockMenu: requested (menu present={})", !menu.is_null());
    menu.cast()
}

fn install_dock_menu_method() -> Result<String, String> {
    let mtm = MainThreadMarker::new().ok_or_else(|| "not running on the main thread".to_string())?;
    let app = NSApplication::sharedApplication(mtm);
    let delegate = app.delegate().ok_or_else(|| "NSApp has no delegate".to_string())?;
    let object: &AnyObject = AsRef::<AnyObject>::as_ref(&*delegate);
    let class: &AnyClass = object.class();
    let class_name = class.name().to_string_lossy().into_owned();
    log::info!("[player::dock_menu] Adding applicationDockMenu: to delegate class {}", class_name);
    // SAFETY: Imp is an untyped fn pointer of the same size; the runtime calls it with the `@@:@` signature registered below, which matches DockMenuImp.
    let imp = unsafe { std::mem::transmute::<DockMenuImp, Imp>(application_dock_menu as DockMenuImp) };
    // SAFETY: on the main thread with a live class object; the type encoding matches the IMP and the returned NSMenu is +0 and owned by DOCK_MENU for the process lifetime.
    let added = unsafe { class_addMethod(class as *const AnyClass as *mut AnyClass, sel!(applicationDockMenu:), imp, c"@@:@".as_ptr()) };
    if !added.as_bool() {
        return Err(format!("class_addMethod(applicationDockMenu:) returned NO on {class_name}; the selector is probably already implemented"));
    }
    // AppKit caches which optional delegate methods exist when the delegate is assigned; re-assigning forces a re-query.
    app.setDelegate(Some(&delegate));
    Ok(class_name)
}

pub fn apply(app: &tauri::AppHandle, view: DockMenuView) {
    if !INSTALL_STARTED.swap(true, Ordering::SeqCst) {
        // First state push: build and install the menu. init_on_main_thread reads the
        // state we just remembered via current_view(), so the menu starts up-to-date.
        if let Err(e) = app.run_on_main_thread(init_on_main_thread) {
            log::error!("[player::dock_menu] Could not schedule install on the main thread; continuing without a Dock menu: {}", e);
        }
        return;
    }
    if !AVAILABLE.load(Ordering::Relaxed) {
        log::debug!("[player::dock_menu] Dock menu not available; skipping update");
        return;
    }
    let result = app.run_on_main_thread(move || {
        DOCK_MENU.with(|cell| {
            if let Some(dock) = cell.borrow().as_ref() {
                apply_view(dock, &view);
            }
        });
    });
    if let Err(e) = result {
        log::warn!("[player::dock_menu] run_on_main_thread failed: {}", e);
    }
}

fn apply_view(dock: &DockMenu, view: &DockMenuView) {
    dock.title.set_text(&view.title);
    dock.toggle.set_text(&view.toggle_label);
    dock.toggle.set_enabled(view.transport_enabled);
    dock.next.set_text(&view.next_label);
    dock.next.set_enabled(view.transport_enabled);
    dock.previous.set_text(&view.previous_label);
    dock.previous.set_enabled(view.transport_enabled);
    dock.shuffle.set_text(&view.shuffle_label);
    dock.shuffle.set_enabled(view.transport_enabled);
    dock.shuffle.set_checked(view.shuffle_checked);
}
