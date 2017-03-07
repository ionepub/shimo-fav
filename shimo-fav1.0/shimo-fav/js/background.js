$(document).ready(function(){
	var baseUrl = "http://shimofav.applinzi.com/";

	chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
		// check
		if(request.cmd == 'checkFolder'){

			// 使用ajax同步解决异步不能sendResponse问题
			var folderId = request.folderId;
			ajax(baseUrl+"?op=check", "get", {id: folderId}, sendResponse);

		}

		// add
		if(request.cmd=='addList'){
			var list = request.doclist || [];
			var folderId = request.folderId || "";
			
			ajax(baseUrl+"?op=add", "post", {list: list, folderId: folderId}, sendResponse);
		}

		// cancel
		if(request.cmd == 'cancel'){
			var list = request.doclist || [];
			var folderId = request.folderId || "";

			ajax(baseUrl+"?op=cancel", "post", {list: list, folderId: folderId}, sendResponse);
		}

		// update
		if(request.cmd == 'update'){
			var list = request.doclist || [];
			var folderId = request.folderId || "";

			ajax(baseUrl+"?op=update", "post", {list: list, folderId: folderId}, sendResponse);
		}

		// view list
		if(request.cmd == 'view'){
			var folderId = request.folderId || "";
			ajax(baseUrl+"?op=view", "get", {folderId: folderId}, sendResponse);
		}

	});

});

function ajax(url, type, data, callback){
	$.ajax({
		type: type, // post,get
		async: false,
		url: url,
		data: data,
		success: function(response){
			callback(response);
		}
	});
}