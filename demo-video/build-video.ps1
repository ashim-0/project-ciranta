#Requires -Version 5
<#
  build-video.ps1  â€” v3
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Builds the final 1920Ã—1080 Project Pulse demo MP4.

  Steps:
    1. Validate FFmpeg / ffprobe are on PATH.
    2. Record the live application â†’ screen-raw.mp4
       (stops immediately if recording fails).
    3. Validate screen-raw.mp4 with ffprobe (duration must be â‰¥ 60s).
    4. Combine screen + voiceover + music + subtitles â†’ project-pulse-demo.mp4.
#>

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$dir       = $PSScriptRoot
$screenRaw = Join-Path $dir 'screen-raw.mp4'
$narration = Join-Path $dir 'narration.mp3'
$music     = Join-Path $dir 'bg-music.wav'
$subtitles = Join-Path $dir 'subtitles.srt'
$finalMp4  = Join-Path $dir 'project-pulse-demo.mp4'

# â”€â”€ Helper: coloured headers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK {
    param([string]$msg)
    Write-Host (' [OK] ' + $msg) -ForegroundColor Green
}
    param([string]$msg)
    Write-Host (' [OK] ' + $msg) -ForegroundColor Green
}
function Fail([string]$msg) {
    Write-Host "`nERROR: $msg" -ForegroundColor Red
    exit 1
}

# â”€â”€ 1. Pre-flight: FFmpeg & ffprobe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Step 'Checking prerequisites'

$ffmpeg  = Get-Command ffmpeg  -ErrorAction SilentlyContinue
$ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue

if (-not $ffmpeg)  { Fail "ffmpeg not found on PATH. Run:  winget install Gyan.FFmpeg" }
if (-not $ffprobe) { Fail "ffprobe not found on PATH (should ship with FFmpeg)." }
OK "FFmpeg found: $($ffmpeg.Source)"

foreach ($f in @($narration, $music, $subtitles)) {
    if (-not (Test-Path $f)) { Fail "Required asset not found: $f" }
}
OK 'Narration, music, and subtitles present.'

# â”€â”€ 2. Record screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Step 'Recording Project Pulse application (this takes ~3 minutes)'

# Remove stale/corrupt recording from a previous failed run
if (Test-Path $screenRaw) { Remove-Item $screenRaw -Force }

# Run recorder from project root so relative paths inside the script work correctly
$projectRoot = Split-Path $dir -Parent
$recorderRel = 'demo-video\record-screen.mjs'

$rec = Start-Process -FilePath 'node' -ArgumentList $recorderRel `
    -WorkingDirectory $projectRoot `
    -NoNewWindow -Wait -PassThru

if ($rec.ExitCode -ne 0) {
    Fail "record-screen.mjs exited with code $($rec.ExitCode). Screen recording failed."
}

# â”€â”€ 3. Validate screen-raw.mp4 with ffprobe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Step 'Validating screen-raw.mp4'

if (-not (Test-Path $screenRaw)) {
    Fail "screen-raw.mp4 was not created."
}

$probe = & ffprobe -v error -select_streams v:0 `
    -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 `
    $screenRaw 2>&1

$duration = [double]0
$parsed   = [double]::TryParse(($probe -replace '[^0-9.]', ''), [ref]$duration)

if (-not $parsed -or $duration -lt 60) {
    $sizeMB = [math]::Round((Get-Item $screenRaw).Length / 1MB, 1)
    Fail "screen-raw.mp4 appears invalid (duration='$probe', size=${sizeMB}MB). Check recorder output above."
}

$sizeMB = [math]::Round((Get-Item $screenRaw).Length / 1MB, 1)
OK "screen-raw.mp4 OK: duration=$([math]::Round($duration,1))s, size=${sizeMB}MB"

# â”€â”€ 4. Render final 1920Ã—1080 MP4 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Step 'Rendering final video (screen + voiceover + music + subtitles)'

# Build subtitle filter â€” forward slashes, escaped colon on Windows
# Example:  C:/Users/.../demo-video/subtitles.srt  â†’ subtitles='C\:/Users/.../demo-video/subtitles.srt'
$srtForward  = $subtitles -replace '\\', '/'
$srtEscaped  = $srtForward -replace ':', '\:'
$subsFilter  = "subtitles='${srtEscaped}':force_style='FontName=Segoe UI,FontSize=20,PrimaryColour=&H00F1F5F9,OutlineColour=&H0008090D,BackColour=&H8008090D,BorderStyle=4,Outline=1,MarginV=36'"

# Full filter_complex:
#   [0:v] - scale/pad to exactly 1920Ã—1080, burn subtitles
#   [1:a] - voiceover: resample + loudnorm
#   [2:a] - bg music: resample + lower volume + fade in/out
#   final audio = amix(voice, music)
$filterComplex = "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,$subsFilter[v];[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[voice];[2:a]aresample=48000,volume=0.14,afade=t=in:st=0:d=3,afade=t=out:st=174:d=6[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]"

Write-Host "  Running FFmpeg render..." -ForegroundColor DarkCyan

& ffmpeg -y `
    -i $screenRaw `
    -i $narration `
    -i $music `
    -filter_complex $filterComplex `
    -map '[v]' -map '[a]' `
    -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -r 30 `
    -movflags '+faststart' `
    -c:a aac -b:a 192k `
    -t 180 `
    $finalMp4

if ($LASTEXITCODE -ne 0) {
    # Subtitle filter can fail on some FFmpeg builds due to path escaping.
    # Fallback: render without burned subtitles.
    Write-Host "`n  Subtitle burn failed. Retrying without subtitles (use a media player that loads .srt)..." -ForegroundColor Yellow

    $filterNoSubs = "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v];[1:a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[voice];[2:a]aresample=48000,volume=0.14,afade=t=in:st=0:d=3,afade=t=out:st=174:d=6[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]"

    & ffmpeg -y `
        -i $screenRaw `
        -i $narration `
        -i $music `
        -filter_complex $filterNoSubs `
        -map '[v]' -map '[a]' `
        -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -r 30 `
        -movflags '+faststart' `
        -c:a aac -b:a 192k `
        -t 180 `
        $finalMp4

    if ($LASTEXITCODE -ne 0) {
        Fail "FFmpeg render failed (exit $LASTEXITCODE). Check the output above."
    }

    Write-Host "  Note: subtitles NOT burned into video. Load '$subtitles' as an external subtitle track in VLC or similar." -ForegroundColor Yellow
}

# â”€â”€ 5. Final validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Step 'Final video check'

$finalDuration = & ffprobe -v error -select_streams v:0 `
    -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 `
    $finalMp4 2>&1

$finalSizeMB = [math]::Round((Get-Item $finalMp4).Length / 1MB, 1)
OK "project-pulse-demo.mp4: duration=${finalDuration}s, size=${finalSizeMB}MB"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Final video saved to:" -ForegroundColor Green
Write-Host "    $finalMp4" -ForegroundColor White
Write-Host "  Subtitles (sidecar): $subtitles" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Green


