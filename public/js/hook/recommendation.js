window.assertSentinel = function assertSentinel(){
    $("#stupa").hide().fadeIn(3333);
    $("#stupa").click(function(e){
      e.preventDefault();
      $('body').css('cursor', 'progress');
      if(TEMPEST.pageREC() !== "node"){
        processMahoo();
        return;
      }
      processSentinel()
    })
}
