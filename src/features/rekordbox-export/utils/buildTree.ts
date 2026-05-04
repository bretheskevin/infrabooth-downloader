import type { RekordboxTreeNode } from '@/bindings';

// Must match Rust constants in src-tauri/src/services/rekordbox/models.rs
const INFRABOOTH_FOLDER_NAME = 'InfraBooth Downloader';
const PLAYLIST_TYPE_FOLDER = 1;

export function findInfraboothFolderId(nodes: RekordboxTreeNode[]): string | null {
  const infrabooth = nodes.find((n) => n.name === INFRABOOTH_FOLDER_NAME && n.parentId === 'root' && n.attribute === PLAYLIST_TYPE_FOLDER);
  return infrabooth?.id ?? null;
}

export function findPlaylistParentId(nodes: RekordboxTreeNode[], playlistName: string): string | null {
  const playlist = nodes.find((n) => n.name === playlistName && n.attribute !== PLAYLIST_TYPE_FOLDER);
  if (!playlist) return null;
  return playlist.parentId === 'root' ? null : playlist.parentId;
}

export function getAncestorIds(nodes: RekordboxTreeNode[], folderId: string | null): Set<string> {
  if (folderId === null) return new Set();
  const parentMap = new Map<string, string>();
  for (const node of nodes) {
    parentMap.set(node.id, node.parentId);
  }
  const ancestors = new Set<string>();
  let current: string | undefined = folderId;
  while (current && current !== 'root') {
    ancestors.add(current);
    current = parentMap.get(current);
  }
  return ancestors;
}

export function folderExistsInTree(nodes: RekordboxTreeNode[], folderId: string): boolean {
  return nodes.some((n) => n.id === folderId && n.attribute === PLAYLIST_TYPE_FOLDER);
}

export interface TreeNode {
  id: string;
  name: string;
  isFolder: boolean;
  seq: number;
  children: TreeNode[];
}

export function buildTreeFromNodes(nodes: RekordboxTreeNode[]): TreeNode[] {
  const childrenMap = new Map<string, RekordboxTreeNode[]>();

  for (const node of nodes) {
    const siblings = childrenMap.get(node.parentId) ?? [];
    siblings.push(node);
    childrenMap.set(node.parentId, siblings);
  }

  function buildChildren(parentId: string): TreeNode[] {
    const children = childrenMap.get(parentId) ?? [];
    return children
      .sort((a, b) => a.seq - b.seq)
      .map((node) => ({
        id: node.id,
        name: node.name,
        isFolder: node.attribute === PLAYLIST_TYPE_FOLDER,
        seq: node.seq,
        children: buildChildren(node.id),
      }));
  }

  return buildChildren('root');
}
