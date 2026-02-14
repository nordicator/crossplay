const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const SWIFT_SOURCE = `import Foundation
import MediaPlayer
import StoreKit
import React

@objc(AppleMusicRemote)
class AppleMusicRemote: NSObject {
  private let player = MPMusicPlayerController.systemMusicPlayer

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    SKCloudServiceController.requestAuthorization { status in
      resolve(status.rawValue)
    }
  }

  @objc func requestCapabilities(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let controller = SKCloudServiceController()
    controller.requestCapabilities { capabilities, error in
      if let error = error {
        reject(\"apple_capabilities_error\", error.localizedDescription, error)
        return
      }
      resolve([
        \"musicCatalogPlayback\": capabilities.contains(.musicCatalogPlayback),
        \"addToCloudMusicLibrary\": capabilities.contains(.addToCloudMusicLibrary)
      ])
    }
  }

  @objc func setQueue(
    _ storeIDs: [String],
    play: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let descriptor = MPMusicPlayerStoreQueueDescriptor(storeIDs: storeIDs)
    player.setQueue(with: descriptor)
    if play {
      player.play()
    }
    resolve(true)
  }

  @objc func play(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    player.play()
    resolve(true)
  }

  @objc func pause(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    player.pause()
    resolve(true)
  }

  @objc func skipToNext(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    player.skipToNextItem()
    resolve(true)
  }

  @objc func skipToPrevious(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    player.skipToPreviousItem()
    resolve(true)
  }

  @objc func seekTo(
    _ milliseconds: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let seconds = milliseconds.doubleValue / 1000.0
    player.currentPlaybackTime = seconds
    resolve(true)
  }

  @objc func getNowPlaying(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let item = player.nowPlayingItem else {
      resolve(nil)
      return
    }

    let payload: [String: Any] = [
      \"title\": item.title ?? \"\",
      \"artist\": item.artist ?? \"\",
      \"albumTitle\": item.albumTitle ?? \"\",
      \"durationMs\": Int(item.playbackDuration * 1000),
      \"playbackState\": player.playbackState.rawValue
    ]
    resolve(payload)
  }
}
`;

const OBJC_SOURCE = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppleMusicRemote, NSObject)

RCT_EXTERN_METHOD(requestAuthorization:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestCapabilities:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setQueue:(NSArray<NSString *> *)storeIDs play:(BOOL)play resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(play:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(pause:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(skipToNext:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(skipToPrevious:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(seekTo:(nonnull NSNumber *)milliseconds resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getNowPlaying:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
`;

function withAppleMusicRemote(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.NSAppleMusicUsageDescription =
      config.modResults.NSAppleMusicUsageDescription ||
      'Crossplay needs access to control Apple Music playback.';
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
      const iosTargetDir = path.join(projectRoot, 'ios', projectName);
      fs.mkdirSync(iosTargetDir, { recursive: true });
      fs.writeFileSync(path.join(iosTargetDir, 'AppleMusicRemote.swift'), SWIFT_SOURCE);
      fs.writeFileSync(path.join(iosTargetDir, 'AppleMusicRemote.m'), OBJC_SOURCE);
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const project = config.modResults;

    const groupName = projectName;
    const swiftPath = `${projectName}/AppleMusicRemote.swift`;
    const objcPath = `${projectName}/AppleMusicRemote.m`;

    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: swiftPath,
      groupName,
      project,
    });
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: objcPath,
      groupName,
      project,
    });

    return config;
  });

  return config;
}

module.exports = createRunOncePlugin(withAppleMusicRemote, 'with-apple-music-remote', '1.0.0');
