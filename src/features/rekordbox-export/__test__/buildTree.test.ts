import { describe, it, expect } from 'vitest';
import type { RekordboxTreeNode } from '@/bindings';
import { buildTreeFromNodes, findInfraboothFolderId, findPlaylistParentId, folderExistsInTree, getAncestorIds, type TreeNode } from '../utils/buildTree';

function makeNode(id: string, name: string, parentId: string, attribute: number, seq: number): RekordboxTreeNode {
  return { id, name, parentId, attribute, seq };
}

describe('buildTreeFromNodes', () => {
  it('returns empty array for empty input', () => {
    expect(buildTreeFromNodes([])).toEqual([]);
  });

  it('builds a flat list of root folders', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('1', 'Folder A', 'root', 1, 2),
      makeNode('2', 'Folder B', 'root', 1, 1),
    ];
    const result = buildTreeFromNodes(nodes);
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('Folder B');
    expect(result[1]!.name).toBe('Folder A');
  });

  it('sorts children by seq', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('1', 'Parent', 'root', 1, 1),
      makeNode('2', 'Child C', '1', 1, 3),
      makeNode('3', 'Child A', '1', 1, 1),
      makeNode('4', 'Child B', '1', 1, 2),
    ];
    const result = buildTreeFromNodes(nodes);
    expect(result).toHaveLength(1);
    expect(result[0]!.children.map((c: TreeNode) => c.name)).toEqual(['Child A', 'Child B', 'Child C']);
  });

  it('distinguishes folders from playlists by attribute', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('1', 'My Folder', 'root', 1, 1),
      makeNode('2', 'My Playlist', 'root', 0, 2),
    ];
    const result = buildTreeFromNodes(nodes);
    expect(result[0]!.isFolder).toBe(true);
    expect(result[1]!.isFolder).toBe(false);
  });

  it('builds nested tree structure', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('1', 'Root Folder', 'root', 1, 1),
      makeNode('2', 'Sub Folder', '1', 1, 1),
      makeNode('3', 'Deep Playlist', '2', 0, 1),
    ];
    const result = buildTreeFromNodes(nodes);
    expect(result).toHaveLength(1);
    expect(result[0]!.children).toHaveLength(1);
    expect(result[0]!.children[0]!.name).toBe('Sub Folder');
    expect(result[0]!.children[0]!.children).toHaveLength(1);
    expect(result[0]!.children[0]!.children[0]!.name).toBe('Deep Playlist');
    expect(result[0]!.children[0]!.children[0]!.isFolder).toBe(false);
  });

  it('handles orphan nodes gracefully', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('1', 'Orphan', 'nonexistent', 1, 1),
      makeNode('2', 'Root', 'root', 1, 1),
    ];
    const result = buildTreeFromNodes(nodes);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Root');
  });
});

describe('findInfraboothFolderId', () => {
  it('returns null for empty array', () => {
    expect(findInfraboothFolderId([])).toBeNull();
  });

  it('finds the InfraBooth Downloader folder at root level', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('ib-id', 'InfraBooth Downloader', 'root', 1, 1),
      makeNode('other', 'Other Folder', 'root', 1, 2),
    ];
    expect(findInfraboothFolderId(nodes)).toBe('ib-id');
  });

  it('returns null when InfraBooth Downloader is not a folder', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('ib-id', 'InfraBooth Downloader', 'root', 0, 1),
    ];
    expect(findInfraboothFolderId(nodes)).toBeNull();
  });

  it('returns null when InfraBooth Downloader is not at root', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('ib-id', 'InfraBooth Downloader', 'some-parent', 1, 1),
    ];
    expect(findInfraboothFolderId(nodes)).toBeNull();
  });
});

describe('findPlaylistParentId', () => {
  it('returns null for empty array', () => {
    expect(findPlaylistParentId([], 'My Playlist')).toBeNull();
  });

  it('returns null when playlist does not exist', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'Folder', 'root', 1, 1),
    ];
    expect(findPlaylistParentId(nodes, 'Missing')).toBeNull();
  });

  it('returns parent folder id when playlist exists in a folder', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'InfraBooth Downloader', 'root', 1, 1),
      makeNode('p1', 'My Mix', 'f1', 0, 1),
    ];
    expect(findPlaylistParentId(nodes, 'My Mix')).toBe('f1');
  });

  it('returns null when playlist is at root level', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('p1', 'My Mix', 'root', 0, 1),
    ];
    expect(findPlaylistParentId(nodes, 'My Mix')).toBeNull();
  });

  it('ignores folders with the same name', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'DJ Sets', 'root', 1, 1),
    ];
    expect(findPlaylistParentId(nodes, 'DJ Sets')).toBeNull();
  });

  it('returns parent of nested playlist', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'InfraBooth Downloader', 'root', 1, 1),
      makeNode('f2', 'Sub Folder', 'f1', 1, 1),
      makeNode('p1', 'Deep Playlist', 'f2', 0, 1),
    ];
    expect(findPlaylistParentId(nodes, 'Deep Playlist')).toBe('f2');
  });
});

describe('getAncestorIds', () => {
  it('returns empty set for null folderId', () => {
    expect(getAncestorIds([], null)).toEqual(new Set());
  });

  it('returns single id for root-level folder', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'Folder', 'root', 1, 1),
    ];
    expect(getAncestorIds(nodes, 'f1')).toEqual(new Set(['f1']));
  });

  it('returns full ancestor chain for nested folder', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'Top', 'root', 1, 1),
      makeNode('f2', 'Mid', 'f1', 1, 1),
      makeNode('f3', 'Deep', 'f2', 1, 1),
    ];
    expect(getAncestorIds(nodes, 'f3')).toEqual(new Set(['f1', 'f2', 'f3']));
  });

  it('handles unknown folderId gracefully', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'Folder', 'root', 1, 1),
    ];
    expect(getAncestorIds(nodes, 'nonexistent')).toEqual(new Set(['nonexistent']));
  });
});

describe('folderExistsInTree', () => {
  it('returns true when folder exists with matching id', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'My Folder', 'root', 1, 1),
    ];
    expect(folderExistsInTree(nodes, 'f1')).toBe(true);
  });

  it('returns false when id does not exist', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('f1', 'My Folder', 'root', 1, 1),
    ];
    expect(folderExistsInTree(nodes, 'nonexistent')).toBe(false);
  });

  it('returns false when id exists but is a playlist (not a folder)', () => {
    const nodes: RekordboxTreeNode[] = [
      makeNode('p1', 'My Playlist', 'root', 0, 1),
    ];
    expect(folderExistsInTree(nodes, 'p1')).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(folderExistsInTree([], 'any-id')).toBe(false);
  });
});
