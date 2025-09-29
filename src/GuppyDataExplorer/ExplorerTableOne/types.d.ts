export type { GqlFilter } from '../../GuppyComponents/types';
export type { ExplorerFilterSet, SavedExplorerFilterSet } from '../types';

export type TableOneBaseVariable = {
  name: string;
  type: 'categorical' | 'continuous';
  missingFromTotal: string;
  missingFromTotalCount: number;
  missingFromTrue: string;
  missingFromTrueCount: number;
};

export type TableOneCategoricalData = {
  data: {
    true: string;
    trueCount: number;
    total: string;
    totalCount: number;
  };
  name: string;
};

export type TableOneContinuousData = {
  mean: {
    true: number;
    trueCount: number;
    total: number;
    totalCount: number;
  };
};

export type TableOneContinuesVariable = TableOneBaseVariable &
  TableOneContinuousData;

export type TableOneCategoricalVariable = TableOneBaseVariable & {
  keys: TableOneCategoricalData[];
};

export type TableOneResult = {
  variables: (TableOneCategoricalVariable | TableOneContinuesVariable)[];
  totalCount: number;
  trueCount: number;
};

export type TableOneFilterSet = {
  filter: GqlFilter;
  id: number;
  name: string;
  explorerId: number;
};

export type CovariateCategorical = {
  type: 'categorical';
  label: string;
  selectedKeys: string[];
};

export type CovariateContinuous = {
  type: 'continuous';
  label: string;
};

export type Covariate = CovariateCategorical | CovariateContinuous;

export type Covariates = {
  [key: string]: Covariate;
};

export type UserInput = {
  filterSets: TableOneFilterSet[];
  covariates: Covariates;
};

export type UserInputSubmitHandler = (userInput: UserInput) => void;
