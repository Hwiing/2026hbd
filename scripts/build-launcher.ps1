$ErrorActionPreference = 'Stop'
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeDirectory = Join-Path $projectDirectory '.local/launcher'
$desktopDirectory = [Environment]::GetFolderPath('Desktop')
$desktopExecutable = Join-Path $desktopDirectory 'HBD Yuni.exe'
$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$compiler = Join-Path ([Environment]::GetFolderPath('Windows')) 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'The Windows .NET Framework C# compiler is unavailable.' }
if (Test-Path -LiteralPath $desktopExecutable) {
    $existing = [Diagnostics.FileVersionInfo]::GetVersionInfo($desktopExecutable)
    if ($existing.ProductName -ne 'HBD Yuni Local Launcher') { throw 'An unrelated HBD Yuni.exe already exists on the Desktop. It was preserved.' }
}
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$sourceFile = Join-Path $projectDirectory 'launcher/HbdYuniLauncher.cs'
$generatedFile = Join-Path $runtimeDirectory 'HbdYuniLauncher.generated.cs'
$outputExecutable = Join-Path $runtimeDirectory 'HBD Yuni.exe'
$source = [IO.File]::ReadAllText($sourceFile).Replace('__PROJECT_DIRECTORY__', $projectDirectory.Replace('"', '""')).Replace('__NODE_EXECUTABLE__', $nodeExecutable.Replace('"', '""'))
[IO.File]::WriteAllText($generatedFile, $source, [Text.UTF8Encoding]::new($true))
& $compiler '/nologo' '/target:winexe' '/optimize+' "/out:$outputExecutable" '/reference:System.Windows.Forms.dll' $generatedFile
if ($LASTEXITCODE -ne 0) { throw 'Launcher compilation failed.' }
Copy-Item -LiteralPath $outputExecutable -Destination $desktopExecutable -Force
Write-Output $desktopExecutable
