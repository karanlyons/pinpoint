// HANDLERS

function handleContextMenu(event) {
	//
	// Adds contextual menu item if event target is discrete.
	//
	if (event.userInfo && event.userInfo.display) {
		event.contextMenu.appendContextMenuItem('generateFragmentLink', "Generate Fragment Link");
	}
} safari.application.addEventListener('contextmenu', handleContextMenu, false);


function handleCommand(event) {
	//
	// Calls the injected js to generate a fragment link if the user selects the command from the contextual menu.
	//
	if (event.command === 'generateFragmentLink') {
		safari.application.activeBrowserWindow.activeTab.page.dispatchMessage('generateFragmentLink');
	}
} safari.application.addEventListener('command', handleCommand, false);

function handleMessage(event) {
	//
	// Handles receiving messages from the injected js.
	//
	if (event.name === 'canLoad') { // This is a hack to get settings into the injected js in a timely manner. canLoad is the only synchronous messaging event.
	 	event.message = {
			'preferStandardHashes': safari.extension.settings.preferStandardHashes,
			'highlightTarget': safari.extension.settings.highlightTarget,
			'highlightColor': safari.extension.settings.highlightColor
		};
	}
} safari.application.addEventListener('message', handleMessage, true);