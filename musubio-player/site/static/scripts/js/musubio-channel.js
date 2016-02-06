function MusubioChannel() {
  var that = {};

  // Video player instances.
  that.players = {};

  // Instance states of the video players.
  that.activePlayer = null;
  that.secondaryPlayer = null;

  // The time duration (in seconds) of the entire channel playlist.
  that.playlistTotalDuration = 0;

  // The current channel/videos loaded.
  that.channel = null;
  that.videos = [];

  // Stored states of the currently playing video.
  that.currentVideoIndex = 0;
  that.currentVideo = null;
  that.currentVideoProgress = 0;  // percentage

  that.videoStartTime = 0;

  // The buffer time (in seconds) befor the video ends to load the next video.
  that.loadBufferTime = 7;

  // Stores an observer instance for a callback when the video changes.
  that.onVideoChangeObserver = null;

  // Stores an observer instance for a callback of the video progress every second.
  that.onVideoProgressObserver = null;

  // Rolling of Ricks.
  that.defaultVideoId = 'dQw4w9WgXcQ';

  /**
   * Initializes the channel.
   */
  that.init = function() {
    // Hide the video players.
    document.getElementById('musubio-player1').style.display = 'none';
    document.getElementById('musubio-player2').style.display = 'none';
  };

  /**
   * Sets an observer for a callback when the video changes.
   */
  that.setOnVideoChangeObserver = function(obj) {
    console.log('setOnVideoChangeObserver()');

    that.onVideoChangeObserver = obj;
  };

  /**
   * Sets an observer for a callback of the video progress percentage.
   */
  that.setOnVideoProgressObserver = function(obj) {
    console.log('setOnVideoProgressObserver()');

    that.onVideoProgressObserver = obj;
  };

  /**
   * Sets the duration (seconds) of the entire channel playlist.
   */
  that.setChannelPlaylistDuration = function() {
    that.playlistTotalDuration = 0;

    that.videos.forEach(function(video) {
      that.playlistTotalDuration += parseInt(video.duration);
    });
  };

  /**
   * Set the current video relative to the base-time and the current-time.
   */
  that.calculateCurrentVideo = function() {
    var now = Math.floor(new Date().getTime() / 1000);
    var baseTime = Math.floor(new Date(that.channel.created).getTime() / 1000);
//      var now = Math.floor(new Date('Wed Feb 04 2016 06:03:20 GMT-0800 (PST)').getTime() / 1000);
//      var baseTime = Math.floor(new Date('Wed Feb 04 2016 06:00:00 GMT-0800 (PST)').getTime() / 1000);

    var timeSinceBaseTime = now - baseTime;
    var playlistStartTime = timeSinceBaseTime % that.playlistTotalDuration;

    var currDuration = 0;
    var videoIndex = 0;
    var startTime = 0;
    that.videos.forEach(function(video, index) {
      if (playlistStartTime >= currDuration) {
        videoIndex = index;
        startTime = playlistStartTime - currDuration;
      }

      currDuration += parseInt(video.duration);
    });

    // Set the video and start time.
    that.currentVideoIndex = videoIndex;
    that.currentVideo = that.videos[that.currentVideoIndex];
    that.videoStartTime = startTime;
  };

  /**
   * Gets the next video in the playlist.
   */
  that.getNextVideoIndex = function() {
    var index;

    if (that.currentVideoIndex == that.videos.length - 1) {
      index = 0;
    } else {
      index = parseInt(that.currentVideoIndex + 1);
    }

    return index;
  };

  /**
   * Load the video players into the DOM.
   */
  that.initializePlayers = function() {
    console.log('initializePlayers()');

    // Create 2 YouTube player instances:
    // one as an active video, the other to preload the next video.
    that.createPlayerInstance('musubio-player1', true);
    that.createPlayerInstance('musubio-player2', false);

    that.activePlayer = that.players['musubio-player1'];
    that.secondaryPlayer = that.players['musubio-player2'];
  };

  /**
   * Create a YouTube video player instance.
   *
   * @param id
   * @param active
   */
  that.createPlayerInstance = function(id, active) {
    console.log('createPlayerInstance()');

    var ytPlayer = new YT.Player(id, {
      videoId: that.defaultVideoId,
      playerVars: {
        controls: 0,
        autoplay: 0,
        fs: 0,
        disablekb: 0
      },
      events: {
        onReady: function(event) {
          that.onPlayerReady(event, id);
        },
        onStateChange: that.onPlayerStateChange
      }
    });

    that.players[id] = {
      id: id,
      player: ytPlayer,
      intervalId: null
    };
  };

  that.changeChannel = function(channel) {
    console.log('changeChannel() from musubio-channel');

    // Set the selected channel and videos.
    that.channel = channel;
    that.videos = that.channel.videos;

    // Prepare video to be played.
    that.setChannelPlaylistDuration();
    that.calculateCurrentVideo();

    that.activePlayer = that.players['musubio-player1'];
    that.secondaryPlayer = that.players['musubio-player2'];

    // Load and play.
    that.activePlayer.player.loadVideoById(that.currentVideo.video_id, that.videoStartTime);
    that.activePlayer.player.playVideo();
    that.secondaryPlayer.player.stopVideo();
    that.startListener();

    // Show the active player.
    document.getElementById('musubio-player').style.display = 'block';
    document.getElementById('musubio-player1').style.display = 'block';
    document.getElementById('musubio-player2').style.display = 'none';

    // Observer callback that the video has changed.
    if (that.onVideoChangeObserver != null) {
      that.onVideoChangeObserver.onVideoChange(that.channel, that.currentVideo);
    }
  };

  /**
   * Starts a listener to see if a video is within the buffer time to load the next video.
   */
  that.startListener = function() {
    console.log('startListener()');

    that.activePlayer['intervalId'] = setInterval(function() {
      var currentVideoTime = that.activePlayer.player.getCurrentTime();

//        console.log('that.currentVideo.duration:', that.currentVideo.duration);
//        console.log('getCurrentTime():', currentVideoTime);
//        console.log('delta:', that.currentVideo.duration - currentVideoTime);

      if (that.onVideoProgressObserver != null) {
        that.onVideoProgressObserver.onVideoProgress((currentVideoTime / that.currentVideo.duration) * 100);
      }

      if ((that.currentVideo.duration - currentVideoTime) < that.loadBufferTime) {
        // Preload the next video.
        that.secondaryPlayer.player.loadVideoById(that.videos[that.getNextVideoIndex()].video_id, 0).pauseVideo();

        // Stop pinging for video data.
        clearInterval(that.activePlayer.intervalId);
      }
    }, 1000);
  };

  /**
   * Callback when the YouTube player is loaded and ready.
   */
  that.onPlayerReady = function(event, player) {
    console.log('onPlayerReady()');
  };

  /**
   * YouTube callback when the player instance has a state change.
   *
   * @param event
   */
  that.onPlayerStateChange = function(event) {
    console.log('onPlayerStateChange()');

    if (event.data == YT.PlayerState.ENDED) {
      console.log('YT.PlayerState.ENDED');

      that.swapActivePlayer();
      that.currentVideoIndex = that.getNextVideoIndex();
      that.currentVideo = that.videos[that.currentVideoIndex];
      that.activePlayer.player.playVideo();
      that.startListener();

      // Observer callback that the video has changed.
      if (that.onVideoChangeObserver != null) {
        that.onVideoChangeObserver.onVideoChange(that.channel, that.currentVideo);
      }

    } else if (event.data == YT.PlayerState.PAUSED) {
      console.log('YT.PlayerState.PAUSED');

      that.activePlayer.player.playVideo();
    }
  };

  /**
   * Sets the active player as the secondary player, and the secondary player as the active.
   */
  that.swapActivePlayer = function() {
    console.log('swapActivePlayer()');

    var tempPlayer = that.activePlayer;
    that.activePlayer = that.secondaryPlayer;
    that.activePlayer.active = true;

    that.secondaryPlayer = tempPlayer;
    that.secondaryPlayer.active = false;

    document.getElementById(that.activePlayer.id).style.display = 'block';
    document.getElementById(that.secondaryPlayer.id).style.display = 'none';
  };

  that.init();

  return that;
}