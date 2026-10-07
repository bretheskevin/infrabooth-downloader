use std::cell::RefCell;
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, AtomicPtr, Ordering};

use muda::{CheckMenuItem, ContextMenu, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use objc2::ffi::class_addMethod;
use objc2::runtime::{AnyClass, AnyObject, Imp, Sel};
use objc2::{sel, MainThreadMarker};
use objc2_app_kit::NSApplication;

use super::dock_menu::{
    self, DockChoiceView, DockMenuView, ID_CROSSFADE, ID_CROSSFADE_DURATION_MENU, ID_NEXT, ID_PARALLEL_MENU, ID_PREVIOUS, ID_SETTINGS_MENU, ID_SHUFFLE,
    ID_TITLE, ID_TOGGLE,
};

struct DockMenu {
    menu: Menu,
    title: MenuItem,
    toggle: MenuItem,
    next: MenuItem,
    previous: MenuItem,
    shuffle: CheckMenuItem,
    settings: SettingsMenu,
}

struct SettingsMenu {
    root: Submenu,
    crossfade: CheckMenuItem,
    crossfade_duration: Submenu,
    crossfade_duration_items: Vec<CheckMenuItem>,
    parallel: Submenu,
    parallel_items: Vec<CheckMenuItem>,
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
    log::info!(
        "[player::dock_menu] Building Dock menu (title='{}', transport_enabled={}, crossfade={}, duration_choices={}, parallel_choices={})",
        view.title,
        view.transport_enabled,
        view.crossfade_checked,
        view.crossfade_duration_choices.len(),
        view.parallel_choices.len()
    );
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
    let settings = build_settings_menu(view)?;
    let transport_separator = PredefinedMenuItem::separator();
    let settings_separator = PredefinedMenuItem::separator();
    let menu = Menu::with_items(&[&title, &toggle, &next, &previous, &transport_separator, &shuffle, &settings_separator, &settings.root])
        .map_err(|e| format!("Menu::with_items failed: {e}"))?;
    Ok(DockMenu { menu, title, toggle, next, previous, shuffle, settings })
}

fn build_settings_menu(view: &DockMenuView) -> Result<SettingsMenu, String> {
    let crossfade = CheckMenuItem::with_id(ID_CROSSFADE, &view.crossfade_label, true, view.crossfade_checked, None);
    let crossfade_duration_items = build_choice_items(&view.crossfade_duration_choices);
    let crossfade_duration = build_choice_submenu(ID_CROSSFADE_DURATION_MENU, &view.crossfade_duration_label, &crossfade_duration_items)?;
    let parallel_items = build_choice_items(&view.parallel_choices);
    let parallel = build_choice_submenu(ID_PARALLEL_MENU, &view.parallel_label, &parallel_items)?;
    let root = Submenu::with_id_and_items(ID_SETTINGS_MENU, &view.settings_label, true, &[&crossfade, &crossfade_duration, &parallel])
        .map_err(|e| format!("Submenu::with_id_and_items({ID_SETTINGS_MENU}) failed: {e}"))?;
    Ok(SettingsMenu { root, crossfade, crossfade_duration, crossfade_duration_items, parallel, parallel_items })
}

fn build_choice_items(choices: &[DockChoiceView]) -> Vec<CheckMenuItem> {
    choices.iter().map(|choice| CheckMenuItem::with_id(choice.id.as_str(), &choice.label, true, choice.checked, None)).collect()
}

fn build_choice_submenu(id: &str, label: &str, items: &[CheckMenuItem]) -> Result<Submenu, String> {
    let refs: Vec<&dyn IsMenuItem> = items.iter().map(|item| item as &dyn IsMenuItem).collect();
    Submenu::with_id_and_items(id, label, true, &refs).map_err(|e| format!("Submenu::with_id_and_items({id}) failed: {e}"))
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
    apply_settings_view(&dock.settings, view);
}

fn apply_settings_view(settings: &SettingsMenu, view: &DockMenuView) {
    settings.root.set_text(&view.settings_label);
    settings.crossfade.set_text(&view.crossfade_label);
    settings.crossfade.set_checked(view.crossfade_checked);
    settings.crossfade_duration.set_text(&view.crossfade_duration_label);
    apply_choices(&settings.crossfade_duration_items, &view.crossfade_duration_choices);
    settings.parallel.set_text(&view.parallel_label);
    apply_choices(&settings.parallel_items, &view.parallel_choices);
}

fn apply_choices(items: &[CheckMenuItem], choices: &[DockChoiceView]) {
    for (item, choice) in items.iter().zip(choices) {
        item.set_text(&choice.label);
        item.set_checked(choice.checked);
    }
}
