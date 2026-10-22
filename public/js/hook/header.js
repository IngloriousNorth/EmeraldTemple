$(document).on("click", "#mobile_menu", function(e){
	e.preventDefault()
	$(".mobile_menu").slideToggle(333);
})

$(document).on("TEMPEST", function(){
	$(".mobile_menu").slideUp(333);
})

$(window).on("resize", function(){
	if($(window).width() > 1079){
		$(".mobile_menu").fadeOut(1337);
	}
})