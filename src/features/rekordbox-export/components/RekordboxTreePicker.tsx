import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown, Folder, FolderOpen, ListMusic, Plus, RefreshCw, CircleHelp } from 'lucide-react';
import type { RekordboxTreeNode } from '@/bindings';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buildTreeFromNodes, getAncestorIds, type TreeNode } from '../utils/buildTree';

interface RekordboxTreePickerProps {
  nodes: RekordboxTreeNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  newPlaylistName?: string;
}

function NewPlaylistPreview({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 pl-4 py-1 text-sm italic text-muted-foreground">
      <Plus className="h-3.5 w-3.5" />
      <span>{t('rekordboxExport.newPlaylistPreview', { name })}</span>
    </div>
  );
}

function TreePlaylistNode({ node, isUpdateTarget }: { node: TreeNode; isUpdateTarget?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-2 py-1 text-sm cursor-default ${isUpdateTarget ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
      {isUpdateTarget ? <RefreshCw className="h-3.5 w-3.5 text-primary" /> : <ListMusic className="h-3.5 w-3.5" />}
      <span className="truncate">{node.name}</span>
      {isUpdateTarget && (
        <>
          <span className="text-xs text-primary italic">{t('rekordboxExport.existingPlaylistUpdate')}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 whitespace-pre-line">
              <p>{t('rekordboxExport.existingPlaylistUpdateTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

function TreeFolderNode({
  node,
  selectedFolderId,
  onSelectFolder,
  newPlaylistName,
  expandedIds,
}: {
  node: TreeNode;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  newPlaylistName?: string;
  expandedIds: Set<string>;
}) {
  const [open, setOpen] = useState(expandedIds.has(node.id));
  const isSelected = selectedFolderId === node.id;
  const hasExistingPlaylist = newPlaylistName !== undefined && isSelected && node.children.some((c) => !c.isFolder && c.name === newPlaylistName);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        role="button"
        tabIndex={0}
        aria-selected={isSelected}
        className={`flex items-center gap-1 py-1 w-full text-left text-sm rounded-sm cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-accent' : ''}`}
        onClick={() => onSelectFolder(node.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectFolder(node.id); } }}
      >
        <CollapsibleTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <button type="button" className="p-0.5 hover:bg-accent rounded-sm">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </CollapsibleTrigger>
        {open ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
        <span className="truncate">{node.name}</span>
      </div>
      <CollapsibleContent>
        <div className="pl-4">
          {node.children.map((child) =>
            child.isFolder ? (
              <TreeFolderNode
                key={child.id}
                node={child}
                selectedFolderId={selectedFolderId}
                onSelectFolder={onSelectFolder}
                newPlaylistName={newPlaylistName}
                expandedIds={expandedIds}
              />
            ) : (
              <TreePlaylistNode key={child.id} node={child} isUpdateTarget={!!newPlaylistName && isSelected && child.name === newPlaylistName} />
            ),
          )}
          {newPlaylistName !== undefined && isSelected && !hasExistingPlaylist && <NewPlaylistPreview name={newPlaylistName} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function RekordboxTreePicker({ nodes, selectedFolderId, onSelectFolder, newPlaylistName }: RekordboxTreePickerProps) {
  const { t } = useTranslation();
  const tree = useMemo(() => buildTreeFromNodes(nodes), [nodes]);

  const expandedIds = useMemo(() => getAncestorIds(nodes, selectedFolderId), [nodes, selectedFolderId]);

  const isRootSelected = selectedFolderId === null;
  const rootHasExistingPlaylist = newPlaylistName !== undefined && isRootSelected && tree.some((n) => !n.isFolder && n.name === newPlaylistName);

  return (
    <div className="max-h-64 overflow-y-auto rounded-md border p-2 text-sm">
      <button
        type="button"
        aria-selected={isRootSelected}
        className={`flex items-center gap-2 py-1 w-full text-left rounded-sm cursor-pointer hover:bg-accent/50 ${isRootSelected ? 'bg-accent' : ''}`}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-3.5 w-3.5" />
        <span>{t('rekordboxExport.rootFolder')}</span>
      </button>
      {newPlaylistName !== undefined && isRootSelected && !rootHasExistingPlaylist && <NewPlaylistPreview name={newPlaylistName} />}
      {tree.map((node) =>
        node.isFolder ? (
          <TreeFolderNode
            key={node.id}
            node={node}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            newPlaylistName={newPlaylistName}
            expandedIds={expandedIds}
          />
        ) : (
          <TreePlaylistNode key={node.id} node={node} isUpdateTarget={!!newPlaylistName && isRootSelected && node.name === newPlaylistName} />
        ),
      )}
    </div>
  );
}
