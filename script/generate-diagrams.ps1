param(
    ###########################################################################
    # >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    # CONFIGURE THESE TWO PATHS
    #
    # 1. $InputDir:  where your .puml files are located
    # 2. $OutputDir: where generated .svg files will be written
    #
    [string]$InputDir = "./puml",      # <--- CHANGE THIS if needed
    [string]$OutputDir = "./img"    # <--- CHANGE THIS if needed
    # <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    ###########################################################################
)

Write-Host "Input PUML directory: $InputDir"
Write-Host "Output directory:     $OutputDir"

# Ensure output folder exists
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Copy PUML files to output
Copy-Item "$InputDir\*.puml" $OutputDir -ErrorAction SilentlyContinue

# Go to output folder
Push-Location $OutputDir

# Remove old images
Write-Host "Cleaning old images..."
Remove-Item *.svg, *.png, *.pdf -ErrorAction SilentlyContinue

# Render each diagram
Write-Host "Generating diagrams..."
Get-ChildItem *.puml | ForEach-Object {
    $name = $_.Name
    Write-Host " -> Rendering $name"

    docker run --rm `
        -v "$(Get-Location):/data" `
        ghcr.io/plantuml/plantuml `
        -tsvg "/data/$name"
}

# Clean up puml copies
Remove-Item *.puml -ErrorAction SilentlyContinue

Pop-Location

Write-Host "Done! Diagrams saved in: $OutputDir"
