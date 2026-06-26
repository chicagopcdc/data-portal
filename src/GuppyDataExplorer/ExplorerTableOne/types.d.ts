export type { GqlFilter } from '../../GuppyComponents/types';

export type TableOneBaseVariable = {
  name: string;
  type: 'categorical' | 'continuous';
  missingFromEverythingElsePercent: string;
  missingFromEverythingElseCount: number;
  missingFromTruePercent: string;
  missingFromTrueCount: number;
};

export type TableOneCategoricalData = {
  data: {
    truePercent: string;
    trueCount: number;
    everythingElsePercent: string;
    everythingElseCount: number;
  };
  name: string;
};

export type TableOneContinuousBucketData = {
  data: {
    trueMean: string;
    trueCount: number;
    everythingElseMean: string;
    everythingElseCount: number;
  };
  name: string;
};

export type TableOneContinuousData = {
  mean: {
    trueMean: string;
    everythingElseMean: string;
  };
};

export type TableOneContinuousVariable = TableOneBaseVariable &
  (TableOneContinuousData | { buckets: TableOneContinuousBucketData[] });

export type TableOneCategoricalVariable = TableOneBaseVariable & {
  keys: TableOneCategoricalData[];
};

export type TableOneResult = {
  variables: (TableOneCategoricalVariable | TableOneContinousVariable)[];
  everythingElseCount: number;
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
  buckets?: {
    splitValue: number;
    inclusiveLower: boolean;
  }[];
};

export type Covariate = CovariateCategorical | CovariateContinuous;

export type Covariates = {
  [key: string]: Covariate;
};

export type UserInput = {
  filterSets: TableOneFilterSet[];
  covariates: Covariates;
};

export type UserInputSubmitHandler = (userInput: UserInput) => Promise<void>;
