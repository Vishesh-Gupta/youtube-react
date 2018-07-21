import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import YTSearch from 'youtube-api-search';

import SearchBar from './components/search_bar';
import VideoList from './components/video_list'

import key from '../keys.json'
import VideoList from './components/video_list';

class App extends Component {
constructor(props) {
    super(props);

    this.state = { videos: [] };

    YTSearch({ key: key.youtube_data, term: 'surfboards'}, (videos) => {
        this.setState({ videos });
    });
}

    render() {
        return (
            <div>
                <SearchBar />
                <VideoList videos={this.state.videos} />
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