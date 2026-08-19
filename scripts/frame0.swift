import AVFoundation
import AppKit

let args = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let track = asset.tracks(withMediaType: .video).first!
let size = track.naturalSize.applying(track.preferredTransform)
print("durata:", CMTimeGetSeconds(asset.duration), "px:", abs(size.width), "x", abs(size.height), "fps:", track.nominalFrameRate)
let cg = try! gen.copyCGImage(at: .zero, actualTime: nil)
let rep = NSBitmapImageRep(cgImage: cg)
let png = rep.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: args[2]))
print("scritto:", args[2])
