$path = 'c:\Users\rutsu\Downloads\attendance_march.csv'
$out = 'c:\Users\rutsu\shift\data\attendance_march_utf8_final.csv'
$bytes = [System.IO.File]::ReadAllBytes($path)
$sjis = [System.Text.Encoding]::GetEncoding(932)
$text = $sjis.GetString($bytes)
[System.IO.File]::WriteAllText($out, $text, [System.Text.Encoding]::UTF8)
Write-Output "Conversion complete: $out"
