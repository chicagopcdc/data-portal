import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { buildTableOneOptions } from '../../redux/explorer/asyncThunks';

export function useTableOneOptions() {
  const dispatch = useAppDispatch();
  const buildOptions = useAppSelector(
    (s) => s.explorer.config.tableOneConfig.buildOptions,
  );
  if (buildOptions) {
    dispatch(buildTableOneOptions());
  }
}
