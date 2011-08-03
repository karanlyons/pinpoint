//
//		ANIMATION CHECKS
//

function checkForAnimation() {
	//
	// Gets the element defined by the selector, and then runs an animation
	// check if there's a js framework running.
	//
	
	var element = document.querySelector(decodeURIComponent(window.location.hash).replace(/#css\\((.+)\\)/, "$1"));
	
	if (typeof jQuery === 'function') {
		jQuery(document).ready(function() {
			var animating = 1;
			
			var animationCheck = setInterval(function() {
				var elementIsAnimating = (jQuery(element).filter(':animated').length > 0);
				
				if (elementIsAnimating) { animating = animating + 1; }
				else { animating = animating - 1; }
				
				if (animating < 1) { elementIsStatic(animationCheck); }
			}, 100);
		});
	}
	
	else { elementIsStatic(); }
} window.addEventListener('checkForAnimation', checkForAnimation, true);


//
//		HELPER FUNCTIONS
//

function elementIsStatic(animationCheck) {
	//
	// Calls end.js' elementIsStatic().
	//
	window.clearInterval(animationCheck);
	
	var event = document.createEvent('Event');
	event.initEvent('elementIsStatic', true, true);
	document.dispatchEvent(event);
}
