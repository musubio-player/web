function MusubioChannel(options) {
  var that = {};

  that.players = {};
  that.activePlayer = null;
  that.secondaryPlayer = null;
  that.playlistTotalDuration = 0;
  that.channel = options.channel;
  that.videos = that.channel.videos;
  that.currentVideoIndex = 0;
  that.currentVideo = null;
  that.videoStartTime = 0;
  that.loadBufferTime = 7;  // in seconds
  that.onVideoChangeObserver = null;

  /**
   * Initializes the channel.
   */
  that.init = function() {
    // Hide the video players.
    document.getElementById('musubio-player1').style.display = 'none';
    document.getElementById('musubio-player2').style.display = 'none';

    that.setChannelPlaylistDuration();
    that.calculateCurrentVideo();
  };

  /**
   *
   */
  that.setOnVideoChangeObserver = function(obj) {
    console.log('setOnVideoChangeObserver()');
    that.onVideoChangeObserver = obj;
  };

  /**
   * Sets the duration (seconds) of the entire channel playlist.
   */
  that.setChannelPlaylistDuration = function() {
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
   *
   */
  that.loadPlayers = function() {
    console.log('loadPlayers()');

    var ytPlayer = new YT.Player('musubio-player1', {
      width: '800',
      height: '450',
      videoId: that.currentVideo.video_id,
      playerVars: {
        controls: 0
      },
      events: {
        onReady: function(event) {
          that.onPlayerReady(event, 'musubio-player1');
        },
        onStateChange: that.onPlayerStateChange
      }
    });

    that.players['musubio-player1'] = {
      id: 'musubio-player1',
      active: true,
      player: ytPlayer
    };

    ytPlayer = new YT.Player('musubio-player2', {
      width: '800',
      height: '450',
      videoId: that.currentVideo.video_id,
      playerVars: {
        controls: 0
      },
      events: {
        onReady: function(event) {
          that.onPlayerReady(event, 'musubio-player2');
        },
        onStateChange: that.onPlayerStateChange
      }
    });

    that.players['musubio-player2'] = {
      id: 'musubio-player2',
      active: false,
      player: ytPlayer
    };

    that.activePlayer = that.players['musubio-player1'];
    that.secondaryPlayer = that.players['musubio-player2'];
    document.getElementById('musubio-player1').style.display = 'block';

    if (that.onVideoChangeObserver != null) {
      that.onVideoChangeObserver.onVideoChange(that.currentVideo);
    }
  };

  /**
   *
   */
  that.startListener = function() {
    that.activePlayer['intervalId'] = setInterval(function() {
      var currentVideoTime = that.activePlayer.player.getCurrentTime();

//        console.log('that.currentVideo.duration:', that.currentVideo.duration);
//        console.log('getCurrentTime():', currentVideoTime);
//        console.log('delta:', that.currentVideo.duration - currentVideoTime);

      if ((that.currentVideo.duration - currentVideoTime) < that.loadBufferTime) {
        // Preload the next video.
        console.log('===== LOAD NEXT VID');
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
    // Start the video.
    if (that.players[player].active == true) {
      that.activePlayer.player.seekTo(that.videoStartTime).playVideo();
      that.startListener();
    }
  };

  /**
   *
   * @param event
   */
  that.onPlayerStateChange = function(event) {
    if (event.data == YT.PlayerState.ENDED) {
      that.swapActivePlayer();
      that.currentVideoIndex = that.getNextVideoIndex();
      that.currentVideo = that.videos[that.currentVideoIndex];
      that.activePlayer.player.playVideo();
      that.startListener();

      if (that.onVideoChangeObserver != null) {
        that.onVideoChangeObserver.onVideoChange(that.currentVideo);
      }
    } else {
      if (event.data == YT.PlayerState.PAUSED) {
        console.log(that.currentVideo);
        that.activePlayer.player.playVideo();
      }
    }
  };

  /**
   * Sets the active player as the secondary player, and the secondary player as the active.
   */
  that.swapActivePlayer = function() {
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