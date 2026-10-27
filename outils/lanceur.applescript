-- Lanceur Globe-Trotteur : ouvre le jeu dans sa propre fenêtre.
set dossier to POSIX path of ((path to me as text) & "::")
set fichier to dossier & "index.html"
set AppleScript's text item delimiters to " "
set morceaux to text items of fichier
set AppleScript's text item delimiters to "%20"
set url_jeu to "file://" & (morceaux as text)
set AppleScript's text item delimiters to ""
set chrome to false
try
	do shell script "test -d '/Applications/Google Chrome.app' || test -d ~/Applications/'Google Chrome.app'"
	set chrome to true
end try
if chrome then
	-- Fenêtre d'application sans barre d'adresse
	do shell script "open -na 'Google Chrome' --args --app=" & quoted form of url_jeu & " --start-maximized"
else
	do shell script "open " & quoted form of fichier
end if
