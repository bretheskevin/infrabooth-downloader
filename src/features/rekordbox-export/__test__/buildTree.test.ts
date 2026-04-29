import { describe, it, expect } from 'vitest';
import type { RekordboxTreeNode } from '@/bindings';
import { buildTreeFromNodes, findInfraboothFolderId, type TreeNode } from '../utils/buildTree';

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
