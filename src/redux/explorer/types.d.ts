import type {
  FilterConfig,
  GuppyConfig,
  OptionFilter,
} from '../../GuppyComponents/types';
import type {
  ButtonConfig,
  ChartConfig,
  ExplorerFilter,
  ExplorerFilterSet,
  PatientIdsConfig,
  SavedExplorerFilterSet,
  UnsavedExplorerFilterSet,
  SurvivalAnalysisConfig,
  TableConfig,
} from '../../GuppyDataExplorer/types';
import type {
  ParsedSurvivalAnalysisResult,
  SurvivalAnalysisResult,
} from '../../GuppyDataExplorer/ExplorerSurvivalAnalysis/types';
import { SerializedError } from '@reduxjs/toolkit';

export type ExplorerConfig = {
  adminAppliedPreFilters?: {
    [x: string]: OptionFilter;
  };
  buttonConfig: ButtonConfig;
  chartConfig: ChartConfig;
  filterConfig: FilterConfig;
  getAccessButtonLink?: string;
  guppyConfig: GuppyConfig;
  hideGetAccessButton?: boolean;
  patientIdsConfig?: PatientIdsConfig;
  survivalAnalysisConfig: SurvivalAnalysisConfig & { enabled: Boolean };
  tableConfig: TableConfig;
};

export type ExplorerFilter = ExplorerFilter;

export type ExplorerFilterSet = ExplorerFilterSet;

export type UnsavedExplorerFilterSet = UnsavedExplorerFilterSet;

export type ExplorerWorkspace = {
  sessionTabCount: number;
  activeId: string;
  all: {
    [id: string]: ExplorerFilterSet;
  };
};

export type ExplorerState = {
  config: ExplorerConfig;
  explorerFilter: ExplorerFilter;
  explorerId: number;
  explorerIds: ExplorerState['explorerId'][];
  patientIds: string[];
  savedFilterSets: {
    data: SavedExplorerFilterSet[];
    isError: boolean;
  };
  survivalAnalysisResult: {
    data: SurvivalAnalysisResult;
    error: Error | SerializedError;
    isPending: boolean;
    parsed: ParsedSurvivalAnalysisResult;
    staleFilterSetIds: number[];
    usedFilterSetIds: number[];
  };
  workspaces: {
    [explorerId: ExplorerState['explorerId']]: ExplorerWorkspace;
  };
};
