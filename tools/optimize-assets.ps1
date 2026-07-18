Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot

function New-Directory([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

function Get-ScaledSize([System.Drawing.Image]$image, [int]$maxWidth, [int]$maxHeight) {
    $ratio = [Math]::Min(([double]$maxWidth / [double]$image.Width), ([double]$maxHeight / [double]$image.Height))
    $ratio = [Math]::Min([double]1.0, [double]$ratio)
    return [System.Drawing.Size]::new(
        [Math]::Max(1, [int][Math]::Round($image.Width * $ratio)),
        [Math]::Max(1, [int][Math]::Round($image.Height * $ratio))
    )
}

function New-ResizedBitmap([string]$source, [int]$maxWidth, [int]$maxHeight, [bool]$alpha) {
    $image = [System.Drawing.Image]::FromFile($source)
    try {
        $size = Get-ScaledSize $image $maxWidth $maxHeight
        $format = if ($alpha) { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb } else { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb }
        $bitmap = [System.Drawing.Bitmap]::new($size.Width, $size.Height, $format)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            if (-not $alpha) { $graphics.Clear([System.Drawing.Color]::FromArgb(10, 7, 20)) }
            $graphics.DrawImage($image, 0, 0, $size.Width, $size.Height)
        }
        finally {
            $graphics.Dispose()
        }
        return $bitmap
    }
    finally {
        $image.Dispose()
    }
}

function Export-Png([string]$source, [string]$destination, [int]$maxWidth, [int]$maxHeight) {
    $bitmap = New-ResizedBitmap $source $maxWidth $maxHeight $true
    try { $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png) }
    finally { $bitmap.Dispose() }
}

function Export-Jpeg([string]$source, [string]$destination, [int]$maxWidth, [int]$maxHeight, [int]$quality = 82) {
    $bitmap = New-ResizedBitmap $source $maxWidth $maxHeight $false
    try {
        $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
        $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
        $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
            [System.Drawing.Imaging.Encoder]::Quality,
            [long]$quality
        )
        try { $bitmap.Save($destination, $encoder, $parameters) }
        finally { $parameters.Dispose() }
    }
    finally {
        $bitmap.Dispose()
    }
}

$heroDir = Join-Path $projectRoot 'media\hero'
$projectDir = Join-Path $projectRoot 'media\projects'
$lifeDir = Join-Path $projectRoot 'media\life'
$octivisDir = Join-Path $projectRoot 'media\octivis'
New-Directory $heroDir
New-Directory $projectDir
New-Directory $lifeDir
New-Directory $octivisDir

$heroAssets = @(
    @{ Source = 'img2\Mist back.png'; Destination = 'mist-back.png'; Width = 2560; Height = 1200 },
    @{ Source = 'img2\Mist inf.png'; Destination = 'mist-front.png'; Width = 2560; Height = 1200 },
    @{ Source = 'img2\Right build.png'; Destination = 'right-building.png'; Width = 1300; Height = 1300 },
    @{ Source = 'img2\Empire state.png'; Destination = 'empire-state.png'; Width = 800; Height = 1800 },
    @{ Source = 'img2\Left building.png'; Destination = 'left-building.png'; Width = 1200; Height = 1800 }
)
foreach ($asset in $heroAssets) {
    Export-Png (Join-Path $projectRoot $asset.Source) (Join-Path $heroDir $asset.Destination) $asset.Width $asset.Height
}
Export-Jpeg (Join-Path $projectRoot 'img2\bg.png') (Join-Path $heroDir 'bg.jpg') 2560 1800 88

$projectAssets = @(
    @{ Source = 'Projects\Picture1.jpg'; Destination = 'sauron.jpg' },
    @{ Source = 'Projects\1.png'; Destination = 'robot-dog.jpg' },
    @{ Source = 'Projects\2.png'; Destination = 'avid.jpg' },
    @{ Source = 'Projects\Image (14).jpg'; Destination = 'mapless-navigation.jpg' }
)
foreach ($asset in $projectAssets) {
    Export-Jpeg (Join-Path $projectRoot $asset.Source) (Join-Path $projectDir $asset.Destination) 1600 1000 84
}

$lifeAssets = @(
    @{ Source = 'Glimpse\1.jpg'; Destination = '01.jpg' },
    @{ Source = 'Glimpse\2.JPEG'; Destination = '02.jpg' },
    @{ Source = 'Glimpse\3.jpg'; Destination = '03.jpg' },
    @{ Source = 'Glimpse\4.PNG'; Destination = '04.jpg' },
    @{ Source = 'Glimpse\5.jpg'; Destination = '05.jpg' },
    @{ Source = 'Glimpse\6.JPEG'; Destination = '06.jpg' },
    @{ Source = 'Glimpse\7.JPG'; Destination = '07.jpg' },
    @{ Source = 'Glimpse\8.jpg'; Destination = '08.jpg' },
    @{ Source = 'Glimpse\9.JPG'; Destination = '09.jpg' },
    @{ Source = 'Glimpse\10.jpg'; Destination = '10.jpg' }
)
foreach ($asset in $lifeAssets) {
    Export-Jpeg (Join-Path $projectRoot $asset.Source) (Join-Path $lifeDir $asset.Destination) 1600 1600 82
}

$octivisAssets = @(
    @{ Source = 'Octivis\storelayout.png'; Destination = 'store-layout.jpg' },
    @{ Source = 'Octivis\Aiagentsconnection.png'; Destination = 'agent-network.jpg' },
    @{ Source = 'Octivis\Moneysaved.png'; Destination = 'loss-prevention.jpg' }
)
foreach ($asset in $octivisAssets) {
    Export-Jpeg (Join-Path $projectRoot $asset.Source) (Join-Path $octivisDir $asset.Destination) 1600 1000 82
}

Write-Output 'Optimized hero, project, Octivis, and Life in Frames assets.'
