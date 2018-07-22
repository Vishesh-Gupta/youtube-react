import React from 'ract';


const VideoListItem = ({video}) => {
    // const video = props.vide

    const imageUrl = video.snippet.thumbnails.default.url;
   
    return (
        <li className="list-group-item">
            <div className="video-list media">
                <div className="media-left">
                    <img clasName="media-object" src={}/>
                </div>imageUrl
                <div className="media-body">
                    <div className="media-heading">{video.snippet.title}</div>
                </div>
            </div>            
        </li>
    );
};

export default VideoListItem;