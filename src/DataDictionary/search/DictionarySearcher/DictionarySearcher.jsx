import { Component, createRef } from 'react';
import PropTypes from 'prop-types';
import { compareTwoStrings } from 'string-similarity';
import AutoComplete from '../../../gen3-ui-component/components/AutoComplete';
import {
  prepareSearchData,
  searchKeyword,
  getSearchSummary,
  ZERO_RESULT_FOUND_MSG,
} from './searchHelper';
import './DictionarySearcher.css';

class DictionarySearcher extends Component {
  constructor(props) {
    super(props);
    this.searchData = prepareSearchData(props.dictionary);
    this.autoCompleteRef = createRef();
    this.state = {
      suggestionList: [],
      isSearchFinished: false,
      searchResult: {
        matchedNodes: [],
        summary: {},
      },
      hasError: false,
      errorMsg: '',
    };
  }

  componentDidMount() {
    // resume search status after switching back from other pages
    if (this.props.currentSearchKeyword) {
      this.autoCompleteRef.current.setInputText(
        this.props.currentSearchKeyword
      );
      this.search(this.props.currentSearchKeyword);
    }
  }

  componentDidUpdate() {
    if (this.searchData.length === 0)
      this.searchData = prepareSearchData(this.props.dictionary);
  }

  onClearResult = () => {
    this.resetSearchResult();
    this.autoCompleteRef.current.clearInput();
  };

  // eslint-disable-next-line react/no-unused-class-component-methods
  launchClearSearchFromOutside = () => {
    this.onClearResult();
  };

  // eslint-disable-next-line react/no-unused-class-component-methods
  launchSearchFromOutside = (keyword) => {
    this.autoCompleteRef.current.setInputText(keyword);
    this.search(keyword);
  };

  search = (str) => {
    this.props.setIsSearching(true);
    const { result, errorMsg } = searchKeyword(this.searchData, str);
    if (!result || result.length === 0) {
      this.props.setIsSearching(false);
      this.props.onSearchResultUpdated([], []);
      this.setState({
        isSearchFinished: true,
        hasError: true,
        errorMsg,
        suggestionList: [],
      });
      return;
    }
    const summary = getSearchSummary(result);
    this.setState({
      isSearchFinished: true,
      hasError: false,
      searchResult: {
        matchedNodes: result,
        summary,
      },
      suggestionList: [],
    });
    this.props.setIsSearching(false);
    this.props.onSearchResultUpdated(result, summary);
    this.props.onSearchHistoryItemCreated({
      keywordStr: str,
      matchedCount: summary.generalMatchedNodeIDs.length,
    });
    this.props.onSaveCurrentSearchKeyword(str);
  };

  resetSearchResult = () => {
    this.setState({
      isSearchFinished: false,
      searchResult: {
        matchedNodes: [],
        summary: {},
      },
    });
    this.props.onSearchResultCleared();
  };

  inputChangeFunc = (inputText) => {
    this.props.onStartSearching();
    this.resetSearchResult();
    const { result } = searchKeyword(this.searchData, inputText);
    const matchedStrings = {};
    result.forEach((resItem) => {
      resItem.matches.forEach((matchItem) => {
        if (!matchedStrings[matchItem.value]) {
          matchedStrings[matchItem.value] = {
            matchedPieceIndices: matchItem.indices.map((arr) => [
              arr[0],
              arr[1] + 1,
            ]),
          };
        }
      });
    });
    const suggestionList = Object.keys(matchedStrings)
      .sort(
        (str1, str2) =>
          compareTwoStrings(str2, inputText) -
          compareTwoStrings(str1, inputText)
      )
      .map((str) => ({
        fullString: str,
        matchedPieceIndices: matchedStrings[str].matchedPieceIndices,
      }));
    this.setState({
      suggestionList,
    });
  };

  suggestionItemClickFunc = (suggestionItem) => {
    this.autoCompleteRef.current.setInputText(suggestionItem.fullString);
    this.search(suggestionItem.fullString);
  };

  submitInputFunc = (inputText) => {
    this.search(inputText);
  };

  render() {
    return (
      <div className='data-dictionary-searcher'>
        <AutoComplete
          ref={this.autoCompleteRef}
          suggestionList={this.state.suggestionList}
          inputPlaceHolderText='Search in Dictionary'
          onSuggestionItemClick={this.suggestionItemClickFunc}
          onInputChange={this.inputChangeFunc}
          onSubmitInput={this.submitInputFunc}
        />
        {this.state.isSearchFinished && (
          <>
            {!this.state.hasError &&
              (this.state.searchResult.matchedNodes.length > 0 ? (
                <>
                  <div className='dictionary-searcher__result'>
                    <h4 className='dictionary-searcher__result-text'>
                      Search Results
                    </h4>
                    <span
                      className='dictionary-searcher__result-clear body'
                      onClick={this.onClearResult}
                      onKeyPress={(e) => {
                        if (e.charCode === 13 || e.charCode === 32) {
                          e.preventDefault();
                          this.onClearResult();
                        }
                      }}
                      role='button'
                      tabIndex={0}
                      aria-label='Clear result'
                    >
                      Clear Result
                    </span>
                  </div>
                  <li className='dictionary-searcher__result-item body'>
                    <span className='dictionary-searcher__result-count'>
                      {
                        this.state.searchResult.summary
                          .matchedNodeNameAndDescriptionsCount
                      }
                    </span>{' '}
                    matches in nodes (title and description)
                  </li>
                  <li className='dictionary-searcher__result-item body'>
                    <span className='dictionary-searcher__result-count'>
                      {this.state.searchResult.summary.matchedPropertiesCount}
                    </span>{' '}
                    matches in node properties
                  </li>
                </>
              ) : (
                <p>{ZERO_RESULT_FOUND_MSG}</p>
              ))}
            {this.state.hasError && <p>{this.state.errorMsg}</p>}
          </>
        )}
      </div>
    );
  }
}

DictionarySearcher.propTypes = {
  dictionary: PropTypes.object.isRequired,
  setIsSearching: PropTypes.func,
  onSearchResultUpdated: PropTypes.func,
  onSearchHistoryItemCreated: PropTypes.func,
  onSearchResultCleared: PropTypes.func,
  onSaveCurrentSearchKeyword: PropTypes.func,
  currentSearchKeyword: PropTypes.string,
  onStartSearching: PropTypes.func,
};

DictionarySearcher.defaultProps = {
  setIsSearching: () => {},
  onSearchResultUpdated: () => {},
  onSearchHistoryItemCreated: () => {},
  onSearchResultCleared: () => {},
  onSaveCurrentSearchKeyword: () => {},
  currentSearchKeyword: '',
  onStartSearching: () => {},
};

export default DictionarySearcher;
