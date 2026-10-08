import { Action, ActionPanel, Icon, List, type Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { ResultsSection } from "./components/ResultsSection";
import { SearchTypeDropdown } from "./components/SearchTypeDropdown";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useLibraries } from "./hooks/useLibraries";
import { handleError } from "./lib/feedback";
import { prefetchSelectedPlaylist } from "./lib/prefetch";
import { fetchSearch, filterResults, nextSearchType, SEARCH_TYPES, type SearchType } from "./lib/searchTypes";

const SWITCH_TYPE_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "t" };

export default function Search() {
  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("tracks");
  const query = searchText.trim();
  const remoteQuery = useDebouncedValue(query, 300);

  const library = useLibraries()[searchType];
  const search = useCachedPromise(fetchSearch, [searchType, remoteQuery], {
    execute: remoteQuery !== "" && SEARCH_TYPES[searchType].search !== undefined,
    keepPreviousData: true,
    onError: (error) => void handleError(error, "Search failed"),
  });

  const libraryResults = filterResults(library.results, query);
  const searchResults = query !== "" && search.data?.kind === searchType ? search.data : undefined;

  const current = SEARCH_TYPES[searchType];
  const next = SEARCH_TYPES[nextSearchType(searchType)];
  const switchTypeAction = (
    <Action
      title={`Switch to ${next.title}`}
      icon={next.icon}
      shortcut={SWITCH_TYPE_SHORTCUT}
      onAction={() => setSearchType(nextSearchType(searchType))}
    />
  );

  return (
    <List
      isLoading={library.isLoading || (query !== "" && search.isLoading)}
      searchBarPlaceholder={current.placeholder}
      onSearchTextChange={setSearchText}
      onSelectionChange={prefetchSelectedPlaylist}
      searchBarAccessory={<SearchTypeDropdown value={searchType} onChange={setSearchType} />}
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Search SoundCloud…"
        description="Type to search SoundCloud."
        actions={<ActionPanel>{switchTypeAction}</ActionPanel>}
      />
      <ResultsSection
        title={current.libraryTitle}
        results={libraryResults}
        playAsList
        extraActions={switchTypeAction}
      />
      <ResultsSection title="SoundCloud" results={searchResults} playAsList={false} extraActions={switchTypeAction} />
    </List>
  );
}
