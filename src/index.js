import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import YTSearch from 'youtube-api-search';

import SearchBar from './components/search_bar'

import key from '../keys.json'

class App extends Component {
constructor(props) {
    super(props);

    YTSearch({ key: key.youtube_data, term: 'surfboards'}, (data) => {
        console.log(data);
    });

    this.state = { videos: [] };
}

    render() {
        return (
            <div>
                <SearchBar />
            </div>
        );
    }
}


// const App = () => {
//     return (
//     <div>
//       <searchBar />  
//     </div>
//     );
// };

ReactDOM.render(<App />, document.getElementsByTagName('app-root'));