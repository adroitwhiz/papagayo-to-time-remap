// This script reads a user specified .pgo file and
// creates a time remapped layer with the frame values from the file.
// (Re)written by Adroitwhiz

// Originally by Atom
// 04/11/2012
//
// This script is released under the CC-BY license.
// http://creativecommons.org/licenses/by/3.0/
// Because it is not practical for the user to credit me in all occasions,
// I allow users to create content with this script without crediting Atom directly in their published work,
// however, any derived script modifications or distributions of this script must contain this comment and credit Atom.
// This script can not be bundled or added to books or electronic publishing without consulting Atom first.

{
	// Parse a line of text from the file which may or may not be valid.
	// Returns an array, where the first element is the frame number and the second is the phoneme string.
	function parsePhonemeFromLine (line) {
		// Papagayo lines with actual phoneme frames start with 4 tabs, which is also the maximum indentation.
		// Split off the first 4 tabs and check if it worked, meaning this is a phoneme frame line.
		var input = line.split("\t\t\t\t");
		if (input.length === 2 && input[0].length === 0) {
			var phonemeAndFrame = input[1].split(' ');
			// Convert frame number from a String to a Number
			phonemeAndFrame[0] = Number(phonemeAndFrame[0]);
			return phonemeAndFrame;
		}
		return null;
	}

	function returnTimeRemapFrameFromPhoneme(passedItem) {
		// NOTE: This assumes you have a frame in a comp for each phoneme listed in this order (i.e. alphabetically).
		switch(passedItem) {
			case 'AI':
				return 0;
			case 'E':
				return 1;
			case 'etc':
				return 2;
			case 'FV':
				return 3;
			case 'L':
				return 4;
			case 'MBP':
				return 5;
			case 'O':
				return 6;
			case 'rest':
				return 7;
			case 'U':
				return 8;
			case 'WQ':
				return 9;
			case 'TH':
				// Not part of preston-blair default.
				// This is part of preston-blair extended.
				return 10;
			default:
				return -1;
		}
	}


	function main () {
		var project = app.project;
		if (!project) {
			throw new Error("Project does not exist.");
		}

		// Detect the selected comp in the project bin.
		var projectSelection = project.selection;
		// Ensure a single composition is selected.
		if (!(projectSelection.length === 1 && projectSelection[0] instanceof CompItem))
			throw new Error("Select a single composition with your phoneme mouth images before you run this script.");
		var mouthComp = projectSelection[0];
		var mouthCompFrameRate = mouthComp.frameRate;

		// Prompt user to select Papagayo file
		var pgoFile = File.openDialog("Select a Papagayo file to open.", "*.pgo");
		if (pgoFile === null) throw new Error("No file given.");
		// Open the file.
		if (!pgoFile.open("r")) throw new Error("Failed to open file.");

		// Read from the file then close it
		var fileLines = pgoFile.read().split("\n");
		pgoFile.close();

		// Construct array of frames and phonemes.
		var phonemes = [];
		for (var lineNum = 0, len = fileLines.length; lineNum < len; lineNum++) {
			var parsedLine = parsePhonemeFromLine(fileLines[lineNum]);
			if (parsedLine !== null) phonemes.push(parsedLine);
		}
		// Sometimes the frames aren't in order; see https://github.com/LostMoho/Papagayo/issues/8
		phonemes.sort(function(a, b) {return a[0] - b[0]});

		// Create undo group
		app.beginUndoGroup("Create Lip-Sync from Papagayo (.pgo) File");

		// Create a new comp which will contain a time-remapped version of the (selected) mouth comp.
		var frameRate = Number(fileLines[2]); // Frame rate is stored in line 3 of the .pgo file (2 when zero-indexed).
		var lipsyncDuration = Number(fileLines[3]) / frameRate; // Length is stored in line 4 of the .pgo file (3 when zero-indexed).
		var remapComp = project.items.addComp(
			pgoFile.name, // Name comp after the Papagayo file.
			mouthComp.width, // Match dimensions of the mouth comp.
			mouthComp.height,
			mouthComp.pixelAspect,
			lipsyncDuration,
			frameRate
		);

		var mouthLayer = remapComp.layers.add(mouthComp); // Add the mouth comp as a layer to the time-remap comp.
		mouthLayer.timeRemapEnabled = true; // Enable time remapping.
		mouthLayer.outPoint = lipsyncDuration; // With time remap enabled, we can properly set the mouth comp's out point.
		var mouthRemap = mouthLayer.property("Time Remap");
		// By default two keyframes are added when time remap is enabled.
		// Let's remove the second one now, leaving one at time 0 which will be overwritten later.
		// Removing both would disable time remapping.
		mouthRemap.removeKey(2);
		// If we don't ever set a keyframe at time 0, the first time remap keyframe will erroneously remain.
		// Track whether we did set a keyframe at time 0 with this flag.
		var shouldRemoveFirstKeyframe = true;

		for (var i = 0, len = phonemes.length; i < len; i++) {
			var frame = phonemes[i][0];
			var phoneme = phonemes[i][1];

			// Fetch the frame we should be using based upon the phoneme, and divide by the mouth comp's framerate.
			// This gives us a time, in seconds.
			var timeRemapValue = returnTimeRemapFrameFromPhoneme(phoneme) / mouthCompFrameRate;

			// Add a time remap keyframe at the time given by the phoneme's frame.
			var remapKeyframeIndex = mouthRemap.addKey(frame / frameRate);
			mouthRemap.setValueAtKey(remapKeyframeIndex, timeRemapValue);
			mouthRemap.setInterpolationTypeAtKey(remapKeyframeIndex, KeyframeInterpolationType.HOLD);

			if (frame === 0) shouldRemoveFirstKeyframe = false;
		}

		if (shouldRemoveFirstKeyframe) {
			alert("Removed first keyframe");
			mouthRemap.removeKey(1);
		}

		app.endUndoGroup();
	}

	try {
		main();
	} catch (err) {
		alert(err.message);
	}
}