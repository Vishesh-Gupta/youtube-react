import React, { Component } from 'react';

class SearchBar extends Component {
    constructor(props) {
        super(props);

        this.state = { term: '' };
    }

    //Standad is Handle(Event)Change
    // onInputChange(event) {
    //     console.log(event.target.value);
    // }

    render() {
        return (
           <input 
            value = {this.state.term}
            onInput={event => this.setState({ term: event.target.value }) } />
        );
    }
}

// const SearchBar = () => {
//     return <input />;
// };

export default SearchBar;