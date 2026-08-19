import AVFoundation

let args = CommandLine.arguments
let src = URL(fileURLWithPath: args[1])
let dst = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
guard let ex = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough) else {
  print("no export session"); exit(1)
}
ex.outputURL = dst
ex.outputFileType = .mp4
// Sposta l'indice all'inizio senza toccare i fotogrammi: è il faststart.
ex.shouldOptimizeForNetworkUse = true

let sem = DispatchSemaphore(value: 0)
ex.exportAsynchronously { sem.signal() }
sem.wait()

if ex.status == .completed {
  print("ok")
} else {
  print("errore:", ex.error?.localizedDescription ?? "sconosciuto")
  exit(1)
}
