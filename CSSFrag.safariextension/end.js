// HELPER FUNCTIONS

function dictionaryToSelector(dictionary) {
	//
	// Returns a dictionary's values as a concatenated string, removing the last character if it's ">".
	//
	var string = "";
	for (var key in dictionary) { string += dictionary[key]; }
	
	if (string[string.length - 1] === ">") { return string.substring(0, string.length - 1); }
	return string;
}

function nthIndex(element) {
	//
	// Returns the element's DOM position amongst its children as an integer.
	//
	
	var nodes = element.parentNode.childNodes, node;
	var i = 0;
	var count = 1;
	
	while((node = nodes.item(i++)) && (node != element)) {
		if (node.nodeType == 1) count++;
	}
	
	return count;
}

function singleElementWithSelector(selector) {
	//
	// Returns true if the selector has only one corresponding element.
	//
	
	return (document.querySelectorAll(selector).length === 1);
}

function firstElementWithSelector(selector, element) {
	//
	// Returns true if the first element returned by the selector is the same as the given element.
	//
	return (document.querySelector(selector) === element);
}

function fixImageDimensionsRelatedToElement(element) {
	//
	// Given an element, walks up the tree from it, repairing any img nodes' height and width attributes if they weren't properly set.
	//
	
	var currentNode = element.parentNode;
	var imageDimensions = undefined;
	
	do {
		var children = currentNode.childNodes;
		for (child in children) {
			if (children[child].nodeType !== undefined && children[child].nodeName.toLowerCase() === 'img' && parseInt(getComputedStyle(children[child], null).height) === 0 && parseInt(getComputedStyle(children[child], null).width) === 0) {
				imageDimensions = new Image();
				imageDimensions.src = children[child].src;
				children[child].style.height = imageDimensions.height + "px !important";
				children[child].style.width = imageDimensions.width + "px !important";
			}
		}
	} while (currentNode = currentNode.parentNode);
}

function scrollFocusAndHighlight(selector, isFragHash) {
	//
	// Given a selector and whether it is a frag hash, finds the element in the document and scrolls to it. If the user wants it, we also highlight the element and give it focus.
	//
	
	if (document.querySelector("link[href='" + safari.extension.baseURI + "style.css']") === null) {
		document.body.innerHTML += '<link rel="stylesheet" type="text/css" href="' + safari.extension.baseURI + 'style.css" />';
	}
	
	var element = document.querySelector(selector);
	if (element === null) { return false; }
	
	fixImageDimensionsRelatedToElement(element);
	
	var boundingRect = element.getBoundingClientRect();
	
	var bounds = {
		'top': boundingRect.top + document.body.scrollTop,
		'left': boundingRect.left + document.body.scrollLeft,
		'height': boundingRect.height,
		'width': boundingRect.width
	};
	
	if (settings.highlightTarget !== 'none' && (settings.highlightTarget === 'all' || (isFragHash && settings.highlightTarget === 'frag'))) {
		window.scrollTo((bounds.left + (bounds.width / 2) - (window.innerWidth / 2)), (bounds.top + (bounds.height / 2) - (window.innerHeight / 2)));
		
		var highlight = element.cloneNode(true);
		var isImage = (highlight.nodeName.toLowerCase() === 'img');
		highlight.style.cssText = getComputedStyle(element, null).cssText;
		highlight.className = isImage? "image" : "";
		highlight.id = "CSSFragHighlight";
		
		highlight.style.height = getComputedStyle(element, null).height + " !important";
		highlight.style.width = getComputedStyle(element, null).width + " !important";
		
		document.body.innerHTML += "<div id=\"CSSFragHighlightBackground\"></div>";
		var highlightBackground = document.getElementById('CSSFragHighlightBackground');
		highlightBackground.style.left = bounds.left - 5 + "px"; // Subtract 1px for the border, 4px for the padding.
		highlightBackground.style.top = bounds.top - 1 - (isImage? 4 : 0) + "px"; // Subtract 1px for the border, 4px for the padding if this is an image.
		highlightBackground.appendChild(highlight);
		setTimeout(function(){document.body.removeChild(document.getElementById('CSSFragHighlightBackground'));}, 1600);
		
		element.focus();
	}
	else { window.scrollTo(bounds.left, bounds.top); }
}


// CSSFrag

var URL = "";

function handleContextMenu(event) {
	//
	// Sets display to true only if the event target is something discrete.
	//
	
	var display = true;
	var nodeName = event.target.nodeName.toLowerCase();
	var nodeID = event.target.getAttribute('id');
	
	var eventTargets = document.getElementsByClassName("CSSFragTarget"); // Safari doesn't allow passing elements through setContextMenuEventUserInfo, so we're doing it through the DOM.
	if (eventTargets.length > 0) {
		for (var i=0; i<=eventTargets.length; i++) {
			eventTargets[i].className = eventTargets[i].className.replace(/ CSSFragTarget/g, "");
		}
	}

	event.target.className += " CSSFragTarget";	
	safari.self.tab.setContextMenuEventUserInfo(event, { 'display': (nodeName !== 'body' && nodeName !== 'head' && nodeName !== 'html' && nodeName !== '#document' && nodeID !== 'CSSFragLinkWrapper' && nodeID !== 'CSSFragLinkContainer' && nodeID !== 'CSSFragLinkInput') });
} document.addEventListener('contextmenu', handleContextMenu, false);

function handleMessage(event) {
	if (event.name === 'generateFragmentLink') {
		window.settings = safari.self.tab.canLoad(event, 'getSettings'); // Why look! It's another hack!
		var eventTarget = document.getElementsByClassName("CSSFragTarget")[0];
		eventTarget.className = eventTarget.className.replace(/ CSSFragTarget/g, "");
		
		var href = window.location.href.split("#")[0];
		var currentNode = eventTarget;
		var currentNodeAttribute = currentNode.getAttribute('id');
		var oldSelector = "";
		
		if (singleElementWithSelector(currentNodeAttribute)) { // If this element has a unique ID, we're done here.
			if (settings.preferStandardHashes) { URL = href + "#" + currentNodeAttribute; }
			else { URL = href + "#css(%23" + currentNodeAttribute + ")"; }
		}
		else {
			do {
				var nodeName = currentNode.nodeName.toLowerCase()
				if (nodeName === 'body' || nodeName === 'head' || nodeName === 'html' || nodeName === '#document') { break; }
				var currentNodeAttribute = "";
				
				var selector = { // Ordered by their position in the CSS selector.
					'name': nodeName,
					'href': "",
					'src': "",
					'title': "",
					'type': "",
					'rel': "",
					'action': "",
					'for': "",
					'value': "",
					'rows': "",
					'id': "",
					'class': "",
					'nthChild': "",
					'oldSelector': ">" + oldSelector,
				}
				
				var attributes = [ // Ordered by uniqueness. We could do a uniqueness check on the nodeName itself, but that seems *extremely* volatile.
					'href',
					'src',
					'title',
					'type',
					'name',
					'for',
					'value',
					'action',
					'rows',
					'rel',
				]
				
				// ID
				currentNodeAttribute = currentNode.getAttribute('id');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					selector.id = "#" + currentNodeAttribute; // We could fold this into the for loop and do [id='foobar'] instead, but that's...uglier.
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// Class
				currentNodeAttribute = currentNode.getAttribute('class');
				if (currentNodeAttribute !== null && currentNodeAttribute !== '') {
					selector.class = "." + currentNodeAttribute.replace(/ /g, ".");
					if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				}
				
				// All other attributes
				for (var i in attributes) {
					currentNodeAttribute = currentNode.getAttribute(attributes[i]);
					if (currentNodeAttribute !== null) {
						selector[attributes[i]] = "[" + attributes[i] + "='" + currentNodeAttribute.replace(/('")/g, "\\$1") + "']";
						if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
					}
				}
				
				if (firstElementWithSelector(dictionaryToSelector(selector), eventTarget)) { break; }
				
				// :nth-child (We don't break on uniqueness here, because :nth-child is really volatile, and a last resort.)
				var currentNodePosition = nthIndex(currentNode);
				if (currentNodePosition > 1) { // To my knowledge, we can't fold this into the for loop as we're running a different check.
					selector.nthChild = ":nth-child(" + currentNodePosition + ")";
				}
				
				oldSelector = dictionaryToSelector(selector);
			} while (currentNode = currentNode.parentNode);
			
			URL = href + "#css(" + encodeURIComponent(dictionaryToSelector(selector)) + ")"
		}
		
		showURLinWindow();
	}
} safari.self.addEventListener('message', handleMessage, false);

function handleLoadAndHashChange() {
	window.settings = safari.self.tab.canLoad(event, 'getSettings'); // Why look! It's another hack!
	var CSSFragHash = decodeURIComponent(window.location.hash).match(/css\((.+)\)/);
	if (CSSFragHash) { scrollFocusAndHighlight(CSSFragHash[1], true); }
	else if (settings.highlightTarget === 'all' && window.location.hash !== '') { scrollFocusAndHighlight(window.location.hash, false); }
} window.addEventListener('load', handleLoadAndHashChange, false); window.addEventListener('hashchange', handleLoadAndHashChange, false);

function showURLinWindow() {
	if (document.querySelector("link[href='" + safari.extension.baseURI + "style.css']") === null) {
		document.body.innerHTML += '<link rel="stylesheet" type="text/css" href="' + safari.extension.baseURI + 'style.css" />';
	}
	
	if (document.getElementById('CSSFragLinkWrapper') === null) {
		document.body.innerHTML += '<div id="CSSFragLinkWrapper"><div id="CSSFragLinkContainer"><div id="CSSFragLinkPadding"><input id="CSSFragLinkInput" name="CSSFragLinkInput" value="" autofocus></div></div></div>';
		
		document.getElementById('CSSFragLinkInput').addEventListener('keyup', function(event){ event.target.value = URL; event.target.select(); }, false);
		
		document.getElementById('CSSFragLinkWrapper').addEventListener('click', hideURLinWindow, false);
		document.addEventListener('copy', hideURLinWindow, false);
		document.addEventListener('cut', hideURLinWindow, false);
	}
	
	document.getElementById('CSSFragLinkInput').value = URL;
	
	document.getElementById('CSSFragLinkWrapper').style.display = "block";
	document.getElementById('CSSFragLinkWrapper').className = "";
	setTimeout(function(){document.getElementById('CSSFragLinkWrapper').className = "active";}, 0);
	document.getElementById('CSSFragLinkInput').select();
}

function hideURLinWindow(event) {
	if (event.type === 'copy' || event.type === 'cut' || event.target.getAttribute('id') === 'CSSFragLinkWrapper') {
		document.getElementById('CSSFragLinkWrapper').className = "";
		setTimeout(function(){
			document.getElementById('CSSFragLinkWrapper').style.display = "none";
			document.getElementById('CSSFragLinkWrapper').className = "hidden";
		}, 600);
	}
}
