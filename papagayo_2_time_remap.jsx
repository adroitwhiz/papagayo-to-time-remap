// This script reads a user specified .pgo file and 
// creates a time remapped layer with the frame values from the file. 

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
	// Begin small function library.
	function isNumeric(val) {
		return !isNaN(parseFloat(val));
	}

	// Parse a line of text from the file which may or may not be valid.
	// Returns an array.
	function parseLine (line) {
		// Papagayo lines with actual phoneme frames start with 4 tabs, which is also the maximum indentation.
		// Split off the first 4 tabs and check if it worked, meaning this is a phoneme frame line.
		var input = line.split("\t\t\t\t");
		if (input.length === 2 && input[0].length === 0) {
			return input[1].split(' ');
		}
		return null;
	}
	
	function returnFrameFromItem(passedItem) {
		var parsedLine = parseLine(passedItem);
		if (parsedLine === null) return -1;
		if (parsedLine.length !== 0) {
			var frameNum = parseInt(parsedLine[0]);
			if (isNaN(frameNum)) {
				return -1;
			} else {
				return frameNum;
			}
		}
		return -1;
	}

	function returnPhonemeFromItem(passedItem) {
		var parsedLine = parseLine(passedItem);
		if (parsedLine === null) return "";
		if (parsedLine.length >= 1 && isNumeric(parsedLine[0])) {
			return parsedLine[1];
		}
		return "";
	}

	function returnPhonemeForFrame (passedList, passedFrame) {
		result = "";
		for (var n = 0, len = passedList.length; n < len; n++) {
			item = passedList[n];
			if (returnFrameFromItem(item) === passedFrame) {
				return returnPhonemeFromItem(item);
			}
		}
		return "";
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
	// End small function library.
	
	// Create undo group 
	app.beginUndoGroup("Create Lip-Sync from Papagayo (.pgo) File"); 

	// Detect the selected comp in the project bin.
	var projectSelection = app.project.selection;
	if (projectSelection.length == 1) {
		// create project if necessary 
		var proj = app.project; 
		if(!proj) proj = app.newProject(); 

		// create new comp named 'my MOHO comp' 
		var compW = 1280;   // comp width 
		var compH = 720;    // comp height 
		var compL = 30;     // comp length (seconds) 
		var compRate = 30;  // comp frame rate (24fps is the default fps for Papagayo, adjust as needed.) 
		var compBG = [48/255,63/255,84/255] // comp background color 

		var myItemCollection = app.project.items; 
		var myComp = myItemCollection.addComp('my Papagayo comp',compW,compH,1,compL,compRate); 
		myComp.bgColor = compBG; 

		// Prompt user to select text file 
		var myFile = File.openDialog("Select a Papagayo file to open.", "*.pgo");
		if (myFile != null)
		{
			// open file
			var fileOK = myFile.open("r","MOHO","????");
			if (fileOK) {       
				//Add comp 
				if (projectSelection[0] instanceof CompItem) // Test to be sure it is a comp. 
				{                        				        
					thisLayer = myComp.layers.add(projectSelection[0]); // Add the selected comp as a layer to the MOHO comp.
					thisLayer.timeRemapEnabled = true; // Enable time remapping.
					myRemap = thisLayer.property("Time Remap");
					// By default two keyframes are added when time remap is enabled.
					// Let's remove the first one now, effectively making this a freeze frame.
					myRemap.removeKey(1);
				}  
				// Read the text file to get the frame numbers to generate keyframes on.
				var s = "";
				var lastValue = -1;
				var lastLine = "";
				var lstLines = [];
				var l = 0;
				var f = 0;
				while (!myFile.eof) { 
					text = myFile.readln();
					if (text != lastLine) {
						if (text != undefined)
						{
							f = returnFrameFromItem(text);
							if (f != -1) {
								// Only add valid lines of text to the list.
								lstLines.push(text);
								lastLine = text;
							}
						}
					}
				}
				// Close the file. 
				myFile.close();
				
				// Get the last frame number that has a phoneme.
				l = lstLines.length;
				last_frame = returnFrameFromItem(lstLines[l-1]);
				if (last_frame != -1) {
					first_frame = returnFrameFromItem (lstLines[0]);
					if (first_frame != -1) 
					{
						cur_frame = first_frame;
						// Create a time remap keyframe for every frame.
						
						prev_frame_value = NaN;
						for (var i = first_frame; i< last_frame; i++) {
							cur_phoneme = returnPhonemeForFrame(lstLines,i);
							if (cur_phoneme != "") 
							{
								if (!isNumeric(cur_phoneme))
								{
									// Fetch the frame we should be using based upon the phoneme.
									 cur_frame = returnTimeRemapFrameFromPhoneme(cur_phoneme);
									if (cur_frame == -1) 
									{
										// Ok, what is wrong...?
										s = parseInt(i) + ", " + parseInt(first_frame) + ", " + parseInt(last_frame) + ", " + parseInt(cur_frame) + ", " + cur_phoneme;
										alert("Bad phoneme [" + s + "] encountered.");
									}
								}
							}    
							frame_as_time = i/compRate;
							
							if (cur_frame !== prev_frame_value) {
								frame_remap_as_time = cur_frame/compRate;
								myRemap.setValueAtTime(frame_as_time,frame_remap_as_time);
							}
							
							prev_frame_value = cur_frame;
							if (i == first_frame) {
								// Remove the final keyframe that was generated when time remap was enabled.
								myRemap.removeKey(1);
							}
						}
						// Lets go ahead and extend our outpoint to the last frame we detected in our MOHO.dat file.
						thisLayer.outPoint = last_frame/compRate;
					} else {
						alert("First frame is -1.");
					}
				} else {
					alert("Last frame is -1.");
				}
			} else { 
				alert("Problem with MOHO.dat file..?"); 
			}
		} else {
			s = "User canceled operation.";
		}
	} else { 
	  alert("Select a single composition with your phoneme mouth images\nbefore you run this script."); 
	} 
	app.endUndoGroup(); 
}