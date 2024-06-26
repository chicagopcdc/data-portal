import { storiesOf } from '@storybook/react';
import SummaryHorizontalBarChart from '@src/gen3-ui-component/components/charts/SummaryHorizontalBarChart';
import SummaryPieChart from '@src/gen3-ui-component/components/charts/SummaryPieChart';
import SummaryChartGroup from '@src/gen3-ui-component/components/charts/SummaryChartGroup';
import PercentageStackedBarChart from '@src/gen3-ui-component/components/charts/PercentageStackedBarChart';

/** @typedef {import('@src/gen3-ui-component/components/charts/SummaryChartGroup').ChartSummary} ChartSummary */

const virusData = [
  { name: 'H1N1', value: 4000 },
  { name: 'VN1203', value: 3000 },
  { name: 'HIV', value: 2800 },
  { name: 'HuCoV_EMC', value: 2000 },
  { name: 'SARS_CoV', value: 2708 },
  { name: 'CA04', value: 1890 },
];

const genderData = [
  { name: 'female', value: 400 },
  { name: 'male', value: 300 },
];

const birthData = [
  { name: '10-20', value: 400 },
  { name: '20-30', value: 300 },
  { name: '30-40', value: 300 },
];

const raceData = [
  { name: 'race1', value: 400 },
  { name: 'race2', value: 300 },
  { name: 'race3', value: 300 },
];

const speciesData = [
  { name: 'spicies1', value: 400 },
  { name: 'spicies2', value: 300 },
  { name: 'spicies3', value: 300 },
];

const bigSet = [];
const NUM_OPTIONS = 2000;
for (let i = 0; i < NUM_OPTIONS; i += 1) {
  bigSet.push({
    name: `item-${i}`,
    value: Math.random(),
  });
}

/** @type {ChartSummary[]} */
const summaries = [
  { type: 'bar', title: 'Gender', data: genderData },
  { type: 'pie', title: 'Birth-Year', data: birthData, showPercentage: true },
  { type: 'pie', title: 'Species', data: speciesData },
  { type: 'bar', title: 'Race', data: raceData, showPercentage: true },
  { type: 'bar', title: 'Virus', data: virusData },
  { type: 'bar', title: 'Big Set', data: bigSet },
];

const lockedVirus = [
  { name: 'H1N1', value: -1 },
  { name: 'VN1203', value: 3000 },
  { name: 'HIV', value: 2800 },
  { name: 'HuCoV_EMC', value: 2000 },
  { name: 'SARS_CoV', value: 2708 },
  { name: 'CA04', value: 1890 },
];

const lockedBirth = [
  { name: '10-20', value: -1 },
  { name: '20-30', value: 300 },
  { name: '30-40', value: 300 },
];

/** @type {ChartSummary[]} */
const lockedSummaries = [
  { type: 'bar', title: 'Gender', data: genderData },
  { type: 'pie', title: 'Birth-Year', data: lockedBirth },
  { type: 'pie', title: 'Species', data: speciesData },
  { type: 'bar', title: 'Race', data: raceData },
  { type: 'bar', title: 'Virus', data: lockedVirus },
];

/** @type {ChartSummary[]} */
const summariesWithOneEmpty = [
  { type: 'bar', title: 'Gender', data: genderData, chartIsEmpty: true },
  { type: 'pie', title: 'Birth-Year', data: lockedBirth },
  { type: 'pie', title: 'Species', data: speciesData },
  { type: 'bar', title: 'Race', data: raceData },
  { type: 'bar', title: 'Virus', data: virusData },
];

const customizedColorMap = [
  '#c02f42',
  '#175676',
  '#59CD90',
  '#F2DC5D',
  '#40476D',
  '#FFA630',
  '#AE8799',
  '#1A535C',
  '#462255',
];

storiesOf('Chart', module)
  .add('SummaryHorizontalBarChart', () => (
    <SummaryHorizontalBarChart
      data={virusData}
      title='bar chart title'
      showPercentage={false}
    />
  ))
  .add('SummaryHorizontalBarChart with single color and percentage', () => (
    <SummaryHorizontalBarChart
      data={virusData}
      title='bar chart title'
      color='var(--pcdc-color__primary'
      showPercentage
    />
  ))
  .add('SummaryHorizontalBarChart with customized colors', () => (
    <SummaryHorizontalBarChart
      data={virusData}
      title='bar chart title'
      useCustomizedColorMap
      customizedColorMap={customizedColorMap}
    />
  ))
  .add('SummaryPieChart', () => (
    <SummaryPieChart data={virusData} title='pie chart title' showPercentage />
  ))
  .add('SummaryPieChart with customized colors', () => (
    <SummaryPieChart
      data={virusData}
      title='pie chart title'
      showPercentage
      useCustomizedColorMap
      customizedColorMap={customizedColorMap}
    />
  ))
  .add('SummaryChartGroup', () => (
    <SummaryChartGroup summaries={summaries} width={1010} />
  ))
  .add('SummaryChartGroup with only showing 2 at first', () => (
    <SummaryChartGroup
      summaries={summaries}
      width={1010}
      maximumDisplayItem={2}
    />
  ))
  .add('SummaryChartGroup with a Locked Chart', () => (
    <SummaryChartGroup
      summaries={lockedSummaries}
      width={1010}
      lockValue={-1}
      lockMessage='This chart is locked!'
    />
  ))
  .add('SummaryChartGroup with an Empty Chart', () => (
    <SummaryChartGroup
      summaries={summariesWithOneEmpty}
      width={1010}
      chartEmptyMessage='This chart is empty!'
    />
  ))
  .add('PercentageStackedBarChart', () => (
    <PercentageStackedBarChart
      data={virusData}
      title='percentage stacked bar chart title'
    />
  ))
  .add('PercentageStackedBarChart with customized colors', () => (
    <PercentageStackedBarChart
      data={virusData}
      title='percentage stacked bar chart title'
      useCustomizedColorMap
      customizedColorMap={customizedColorMap}
    />
  ))
  .add('PercentageStackedBarChart Locked', () => (
    <PercentageStackedBarChart
      data={lockedVirus}
      title='percentage stacked bar chart title'
    />
  ));
