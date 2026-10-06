// Built using Hyperiux Vault: https://vault.hyperiux.com


import VideoPlayerComp from './VideoPlayerComp'

const VIDEO_SRC = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/showreel.mp4";
const POSTER_SRC = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/showreel-cover.png";

const VideoPlayer = ({
  autoPlay = true,
  startMuted = true,
  showCloseButton = true,
  rounded = false,
  preserveAspectRatio = true,
  hideControlsDelay = 1800,
}) => {
  return (
    <>
      <VideoPlayerComp
        videoSrc={VIDEO_SRC}
        poster={POSTER_SRC}
        autoPlay={autoPlay}
        startMuted={startMuted}
        showCloseButton={showCloseButton}
        rounded={rounded}
        preserveAspectRatio={preserveAspectRatio}
        hideControlsDelay={hideControlsDelay}
      />
    </>
  )
}

export default VideoPlayer
