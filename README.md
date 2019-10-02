# papagayo-to-time-remap
This script imports Papagayo (.pgo) files into After Effects, allowing for easier lipsyncing.

## Usage
Create a 10-frame-long composition containing each syllable image. Ensure that each frame displays the following syllable:

Frame | Syllable|
-|-
0 | AI
1 | E
2 | etc
3 | FV
4 | L
5 | MBP
6 | O
7 | rest
8 | U
9 | WQ

Then, select that composition in the Project panel (typically the left sidebar).

Finally, run this script (File > Scripts > Run Script File...), and select the .pgo file you want to import. It will create a new composition of the same name as the Papagayo file you selected, which contains the lipsynced frames.