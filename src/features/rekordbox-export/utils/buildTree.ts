import type { RekordboxTreeNode } from '@/bindings';

// Must match Rust constants in src-tauri/src/services/rekordbox/models.rs
const INFRABOOTH_FOLDER_NAME = 'InfraBooth Downloader';
const PLAYLIST_TYPE_FOLDER = 1;

export function findInfraboothFolderId(nodes: RekordboxTreeNode[]): string | null {
  const infrabooth = nodes.find(
    (n) => n.name === INFRABOOTH_FOLDER_NAME && n.parentId === 'root' && n.attribute === PLAYLIST_TYPE_FOLDER,
  );
  return infrabooth?.id ?? null;
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
