import logo from './logo.svg';
import './App.css';
import {Amplify,API,graphqlOperation,Storage} from 'aws-amplify';
import {Authenticator} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { createSong, updateSong } from './graphql/mutations';
import { listSongs } from './graphql/queries';
import awsExports from './aws-exports';
import {v4 as uuid} from 'uuid';
import { Paper ,IconButton, TextField} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AddIcon from '@mui/icons-material/Add';
import PauseIcon from '@mui/icons-material/Pause';
import PublishIcon from '@mui/icons-material/Publish';
import { useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
Amplify.configure(awsExports);


export default function App() {

  const [songs,setSongs]=useState([])
  const [songPlaying,setSongPlaying]=useState('');
  const [audioURL,setAudioUrl]=useState('');
  const [showAddSong,setShowAddNewSong]=useState(false);

  useEffect(()=>{
    fetchSongs();
  },[]);


  const toggleSongs = async(idx)=>{
    if(songPlaying === idx){
      setSongPlaying('')
      return;
    }

    const songFilePath=songs[idx].filePath;
   try{
      const fileAccessURL=await Storage.get(songFilePath,{expires:60})
      console.log('access url',fileAccessURL);
      setSongPlaying(idx)
      setAudioUrl(fileAccessURL);
      return;

   }catch(err){
      console.log(err);
      setAudioUrl('');
      setSongPlaying('')
   } 




  }



  const fetchSongs= async()=>{
    try{
        const songData=await API.graphql(graphqlOperation(listSongs));
        const songList=songData.data.listSongs.items;
        console.log('song list',songList);
        setSongs(songList)
    }catch(error){
      console.log('error',error);   
    }
  };

  const addLike=async(idx)=>{
    try{
        const song=songs[idx];
        song.likes=song.likes+1;
        delete song.createdAt;
        delete song.updatedAt;

        const songData= await API.graphql(graphqlOperation(updateSong,{ input:song }));
        const songList=[...songs];
        songList[idx] = songData.data.updateSong;
        setSongs(songList);

    }
    catch(err){
      console.log(err);
    }
  }



  return (
    <Authenticator>
    {({ signOut, user }) => (
      <main>
      <div className='App'>
        <header className='App-header'>
        <button onClick={signOut}>Sign out</button>
        <h2>Sarvatify</h2>
        </header>
        <div className='songList'>
       
          {songs.map((song,idx)=>{
              return (
                <Paper  elevation={2} square key={`song${idx}`} >
                    <div className='songCard'>
                      <IconButton aria-label='Play' onClick={()=>{toggleSongs(idx)}}>
                           {songPlaying === idx ? <PauseIcon/>:<PlayArrowIcon/>}
                      </IconButton>
                      <div>
                          <div className='songTitle'>{song.title}</div>
                          <div className='songOwner'>{song.owner}</div>
                      </div>
                      <IconButton aria-label='Like' onClick={()=> addLike(idx)}>
                           <FavoriteIcon/>
                      </IconButton>
                      {song.likes}
                      <div className='songDes'>{song.description}  </div>
                    </div>
                    { songPlaying===idx ? (
                        <div className='song-player'>
                          <ReactPlayer
                            url={audioURL}
                            controls
                            playing
                            height="50px"
                            onPause={()=>toggleSongs(idx)}
                          />
                        </div>):null}

            
            

                </Paper>
              )
          })}
          {
            showAddSong ?(
                <AddSong onUpload={()=>{setShowAddNewSong(false)
                fetchSongs()
                }}/>
            ):<IconButton onClick={()=>{setShowAddNewSong(true)}}> <AddIcon/> </IconButton>
          }
        </div>
      </div>
      </main>
    )}
  </Authenticator>
  );
}


const AddSong =({onUpload})=>{
  const [songData,setSongData]=useState({});
  const [mp3Data,setMp3Data]=useState();

    const uploadSong=async()=>{
      console.log(songData);
      const {title,description,owner} =songData;
      const { key }= await Storage.put(`${uuid()}.mp3`,mp3Data,{contentType:'audio/mp3'});

      const createSongInput ={
        id:uuid(),
        title,
        description,
        filePath:key,
        likes:0,
        owner,
        
        
      }
     await API.graphql(graphqlOperation(createSong,{input:createSongInput}))

      onUpload();
    };

  return (
      <div className='newSong'>
        <TextField
          label="Title"
          value={songData.title}
          onChange={e=>{setSongData({...songData,title:e.target.value})}}
        />
        <TextField
          label="Artist"
          value={songData.owner}
          onChange={e=>{setSongData({...songData,owner:e.target.value})}}

        />
        <TextField
          label="Description"
          value={songData.description}
          onChange={e=>{setSongData({...songData,description:e.target.value})}}

        />
        <input type="file" accept='audio/mp3' onChange={e=>{setMp3Data(e.target.files[0])}}></input>
        <IconButton onClick={uploadSong}>
            <PublishIcon></PublishIcon>
        </IconButton>
      </div>
  )
}