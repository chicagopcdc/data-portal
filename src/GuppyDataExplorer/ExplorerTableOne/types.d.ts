export type { GqlFilter } from '../../GuppyComponents/types';
export type { ExplorerFilterSet, SavedExplorerFilterSet } from '../types';

export type TableOneBaseVariable = {
  name: string;
  type: 'categorical' | 'continuous';
  missingFromTotal: string;
  missingFromTrue: string;
};

export type TableOneCategoricalData = {
  data: {
    true: string;
    total: string;
  };
  name: string;
};

export type TableOneContinuousData = {
  mean: {
    true: number;
    total: number;
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
