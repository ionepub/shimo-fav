$(function(){
	if(isFolder() && !checkFolderAuth()){
		// 无权限浏览文件夹
		viewFolder();
	}

	if(checkFolderAuth()){
		// 有权限，给页面上的文件夹都加上分享链接
		addFolderShareLink();
	}

	/* 点击页面上的链接跳转时，给文件夹添加分享链接 */
	$("body").on("click", "a", function(){
		setTimeout(function(){
			addFolderShareLink();
		}, 600);
	})

	var helpContent = '<strong>说明</strong><br>'
					+ '<ul><li>1. 分享之后的文件夹即使不登录也可以查看</li><li>2. 仅分享非私有文档和表格</li><li>3. 被分享的仅为文件夹、文档的标题</li><li>4. 文档、文件夹新建或删除时需要“更新分享”</li><li>5. 文档、表格内容的更新不需要“更新分享”</li></ul>';

	/* 分享链接点击事件 */
	$("#list-view-wrap").on("click", " #list-view .list-outer-container .folder .share-folder", function(){
		// 获取文件夹id
		var folderId = $(this).parent(".list-item-menu").parent(".list-item-dropdown").parent(".folder").data("guid");
		if(!folderId){
			return false;
		}

		// 隐藏下拉框
		$(this).parent(".list-item-menu").parent(".list-item-dropdown").removeClass("active");

		// 弹窗
		var modal = '<div class="shimo-modal-overlay">'
						+ '<div class="dialog-wrap share-folder-modal-wrap">'
							+ '<div class="dialog">'
								+ '<div class="dialog-head">'
									+ '<div><span class="dialog-title">分享文件夹</span><span class="hicon icon-close dialog-close-btn"></span></div>'
								+ '</div>'
								+ '<div class="dialog-body">'
									+ '<hr>'
									+ '<div>'
										+ '<div class="btn-wrap"></div>'
										+ '<div class="help-wrap">'+ helpContent +'</div>'
										+ '<div class="log-wrap"></div>'
									+ '</div>'
								+ '</div>'
								+ '<div class="dialog-foot">'
								+ '</div>'
							+ '</div>'
						+ '</div>'
					+ '</div>';
		$(".modal-root").html(modal);

		addLog("正在检查...");

		// 从服务器获取文件夹信息，如果没有记录则弹窗提示是否分享及说明，如果有记录则弹窗显示更新和取消分享按钮
		chrome.extension.sendMessage({cmd: "checkFolder", folderId: folderId}, function(response) {
			// console.log(response);
			// console.log(chrome.extension.lastError);
			if(response == "SUCCESS"){
				// already exist
				addLog("检查完成，请选择操作");

				var editBtns = '<strong>操作</strong><br><button class="sm-btn sm-btn-primary" id="updateShareFolder" data-id="'+ folderId +'">更新分享</button><br><button class="sm-btn sm-btn-primary" id="cancelShareFolder" data-id="'+ folderId +'">取消分享</button>';
				$(".shimo-modal-overlay .dialog-wrap.share-folder-modal-wrap .dialog-body .btn-wrap").html(editBtns);

			}else if(response == "FAILED"){
				// not exist
				addLog("检查完成，请选择操作");

				var editBtns = '<strong>操作</strong><br><button class="sm-btn sm-btn-primary" id="shareFolder" data-id="'+ folderId +'">开始分享</button>';
				$(".shimo-modal-overlay .dialog-wrap.share-folder-modal-wrap .dialog-body .btn-wrap").html(editBtns);
			}else{
				// error
				addLog("检查失败，请重试");
			}
		});

	});

	/* 隐藏分享窗口 */
	$(".modal-root").on("click", ".share-folder-modal-wrap .hicon.icon-close.dialog-close-btn", function(){
		$(".modal-root").html("");
	})

	/* 开始分享按钮点击事件 */
	$(".modal-root").on("click", "#shareFolder", function(){
		$("#shareFolder").attr("disabled", true);
		addLog("开始分享...");
		var folderId = $(this).data('id');
		getDocList(folderId, 'add', true);
	})

	/* 取消分享按钮点击事件 */
	$(".modal-root").on("click", "#cancelShareFolder", function(){
		$("#cancelShareFolder").attr("disabled", true);
		addLog("正在取消分享...");
		var folderId = $(this).data('id');
		getDocList(folderId, 'cancel', true);
	})

	/* 更新分享按钮点击事件 */
	$(".modal-root").on("click", "#updateShareFolder", function(){
		$("#updateShareFolder").attr("disabled", true);
		addLog("正在更新分享...");
		var folderId = $(this).data('id');
		getDocList(folderId, 'update', true);
	})

	var folderCount = 0;
	var openOnNew = 1;

	/* 获取文件夹中所有非私有文档列表(名称、id、类别) */
	function getDocList(folderId, opetate, self){
		if(typeof folderId == "undefined" || !folderId){
			return [];
		}

		addLog("正在拉取数据");
		
		var doclist = [];
		$.get("https://shimo.im/folder/" + folderId, function(data){
			var list = data.match(/tempCurrentFile:(.*)\}/);
			if(typeof list[1] == "undefined"){
				return false;
			}
			list = list[1];

			list += '}';
			list = JSON.parse(list);

			var folderName = list.name;
			if(self == true){
				// 把文件夹自身保存进去
				doclist.push({
					guid: folderId,
					name: folderName,
					type: "folder",
					is_folder: 1
				});
			}

			list = list.children;

			for (var i = 0; i < list.length; i++) {
				var item = list[i];
				if(item.type == 0){
					item.type = "doc";
				}else if(item.type == -1){
					item.type = "spreadsheet";
				}else if(item.type == 1 || item.is_folder == 1){
					item.type = "folder";
				}else{
					// do nothing
				}
				var temp = {
					guid: item.guid,
					name: item.name,
					type: item.type,
					is_folder: item.is_folder
				};
				if(item.is_folder == 1 || item.shareMode == "editable" || item.shareMode == "readonly"){
					// 仅记录所有非私有文档
					doclist.push(temp);
				}
				
				if(item.is_folder == 1){
					// 子文件夹
					getDocList(item.guid, opetate, false);
				}
			}

			addLog("正在处理 [" + folderName + "] 数据...");

			if(opetate == 'add'){
				// 开始分享
				folderCount++;
				
				chrome.extension.sendMessage({cmd: "addList", doclist: doclist, folderId: folderId},function(response) {
					if(typeof response.code == 'undefined'){
						response = JSON.parse(response);
					}
					
					if(response.code == 0){
						// array
						response = response.result;
						for (var i = 0; i < response.length; i++) {
							if(response[i] === true){
								addLog("数据添加成功");
							}else{
								addLog("数据添加失败");
							}
						}
					}

					folderCount--;

					if(folderCount == 0){
						// 数据处理完毕
						addLog("✿✿ヽ(ﾟ▽ﾟ)ノ✿ 分享完成");  // 撒花
						
						// 显示更新和取消分享按钮
						var topFolderId = $("#shareFolder").data('id');
						var editBtns = '<strong>操作</strong><br><button class="sm-btn sm-btn-primary" id="updateShareFolder" data-id="'+ topFolderId +'">更新分享</button><br><button class="sm-btn sm-btn-primary" id="cancelShareFolder" data-id="'+ topFolderId +'">取消分享</button>';
						$(".shimo-modal-overlay .dialog-wrap.share-folder-modal-wrap .dialog-body .btn-wrap").html(editBtns);

					}
				});
			}else if(opetate == 'update'){
				// 更新分享
				folderCount++;

				chrome.extension.sendMessage({cmd: "update", doclist: doclist, folderId: folderId},function(response) {
					if(typeof response.code == 'undefined'){
						response = JSON.parse(response);
					}
					
					if(response.code == 0){
						// array
						response = response.result;
						for (var i = 0; i < response.length; i++) {
							if(response[i] === true){
								addLog("数据更新成功");
							}else{
								addLog("数据更新失败");
							}
						}
					}

					folderCount--;

					if(folderCount == 0){
						// 数据处理完毕
						addLog("✿✿ヽ(ﾟ▽ﾟ)ノ✿ 更新操作已完成");  // 撒花
						
						// 显示更新和取消分享按钮
						var topFolderId = $("#updateShareFolder").data('id');
						var editBtns = '<strong>操作</strong><br><button class="sm-btn sm-btn-primary" id="updateShareFolder" data-id="'+ topFolderId +'">更新分享</button><br><button class="sm-btn sm-btn-primary" id="cancelShareFolder" data-id="'+ topFolderId +'">取消分享</button>';
						$(".shimo-modal-overlay .dialog-wrap.share-folder-modal-wrap .dialog-body .btn-wrap").html(editBtns);

					}
				});
			}else if(opetate == 'cancel'){
				// 取消分享
				folderCount++;

				chrome.extension.sendMessage({cmd: "cancel", doclist: doclist, folderId: folderId},function(response) {
					if(typeof response.code == 'undefined'){
						response = JSON.parse(response);
					}
					
					if(response.code == 0){
						// bool
						if(response.result === true){
							addLog("取消分享成功");
						}else{
							addLog("取消分享失败");
						}
					}

					folderCount--;

					if(folderCount == 0){
						// 数据处理完毕
						addLog("✿✿ヽ(ﾟ▽ﾟ)ノ✿ 取消操作已完成");  // 撒花
						
						// 显示开始分享按钮
						var topFolderId = $("#updateShareFolder").data('id');
						var editBtns = '<strong>操作</strong><br><button class="sm-btn sm-btn-primary" id="shareFolder" data-id="'+ topFolderId +'">开始分享</button>';
						$(".shimo-modal-overlay .dialog-wrap.share-folder-modal-wrap .dialog-body .btn-wrap").html(editBtns);

					}
				});
			}
		});
	}

	/* 给页面上的文件夹都加上分享链接 */
	function addFolderShareLink(){
		setTimeout(function(){
			if($("#list-view-wrap").size() > 0 && !$("#list-view-wrap").hasClass("hide")){
				// 当前不在文档中

				// 删除已添加的，防止页面跳转时第一个文档也加上了分享链接
				$(".list-menu-item.share-folder").remove();
				
				var shareDiv = '<div class="list-menu-item share-folder">'
								+ '<span class="list-menu-item-icon menu-share-folder-icon little-icon-sprite"></span>'
								+ '<span>分享</span>'
								+ '</div>';
				var temp = $("#list-view-wrap #list-view .list-outer-container").find(".list-item .folder .list-item-dropdown .list-menu-item.move-file");
				temp.each(function(index, ele){
					if($(this).siblings(".share-folder").size() <= 0){
						$(this).after(shareDiv);
					}
				})
			}
		}, 300);
	}

	/* 添加log内容 */
	function addLog(content){
		var log = $(".dialog-wrap.share-folder-modal-wrap .log-wrap").html();
		log += content + "<br>";
		$(".dialog-wrap.share-folder-modal-wrap .log-wrap").html(log);

		// 滚动到最底部
		$(".dialog-wrap.share-folder-modal-wrap .log-wrap").animate({
			'scrollTop': $(".dialog-wrap.share-folder-modal-wrap .log-wrap")[0].scrollHeight
		}, 'fast');
	}

	/* 检查当前是否文件夹 */
	function isFolder(){
		var currentUrl = location.href;
		if(currentUrl.indexOf("folder/") > -1){
			return true;
		}
		return false;
	}

	/* 检查是否有文件夹浏览权限，无权限时返回false */
	function checkFolderAuth(){
		if($(".error-box.error-403-box").size() > 0){
			return false;
		}
		return true;
	}

	/* 浏览无权限的文件夹 */
	function viewFolder(){
		// console.log('无权限浏览文件夹');

		// 添加loading
		showLoading();

		// 获取folderId
		var folderId = location.href.replace(/https:\/\/shimo.im\/folder\//, '');
		if(folderId){
			// 渲染列表
			renderList(folderId);
		}
	}

	/* 渲染列表 */
	function renderList(folderId){
		// 获取文件夹内容
		chrome.extension.sendMessage({cmd: "view", folderId: folderId},function(response) {
			if(typeof response.code == 'undefined'){
				response = JSON.parse(response);
			}
			// console.log(response);
			if(response.length <= 0){
				// 没有数据
				showHeaders();
				showEmpty();
				hideLoading();
				return;
			}
			for (var i = 0; i < response.length; i++) {
				if(response[i]['guid'] == folderId){
					renderCurrentFolder(response[i]);
				}else{
					// 子文件夹/文档
					renderChildList(response[i]);
				}
			}
			if(response.length == 1){
				// 空文件夹
				showEmpty();
			}
			hideLoading();
		})
	}

	/* 渲染当前文件夹标题等 */
	function renderCurrentFolder(folder){
		if(typeof folder == "object"){
			showHeaders();
			// 修改页面标题
			$("title").text(folder.name);
			addCrumb(folder);
		}else{
			return false;
		}
	}

	/* 渲染单个子文件夹、文档 */
	function renderChildList(child){
		if(typeof child == "object"){
			if($(".children").size() <= 0){
				$("body").append('<div class="children"><ul></ul></div>');
			}
			var itemHtml = getTemplate(child);
			$(".children ul").append(itemHtml);
		}else{
			return false;
		}
	}

	/* 显示头部 */
	function showHeaders(){
		// 不显示注册登录按钮
		var headerHtml = '<div class="headerWrap"><div id="header"><a href="/" class="home-link logo-22 notlogged-link"></a><a href="/" class="home-slogan">可多人实时协作的云端文档和表格</a></div></div>';
		$(".loadingWrap").before(headerHtml);
	}

	/* 显示面包屑 */
	function addCrumb(folder){
		var crumb = '<div class="crumbWrap"><div class="crumb-list list-crumb"><a class="crumb list-crumb-item " href="/desktop" data-guid="0">我的桌面</a><span class="hicon icon-breadcrumb"></span><span class="no-crumb">'+ folder.name +'</span></div></div>';
		// 添加面包屑
		$(".loadingWrap").before(crumb);
	}

	/* 无权限页面上展示加载效果 */
	function showLoading(){
		var loadingWrap = '<div class="loadingWrap"><div class="load-container load6"><div class="loader">Loading...</div></div></div>';
		$("body").append(loadingWrap);
		$(".loadingWrap").fadeIn("500", function(){
			$("body").removeClass("no-permission").addClass("readonly");
			$(".logo-white-22").hide();
			$(".error-403-box").hide();
		});
	}

	/* 隐藏loading */
	function hideLoading(){
		$(".loadingWrap").fadeOut("500");
	}
	
	/* 显示空 */
	function showEmpty(){
		var empty = '<div class="list-empty" draggable="false"><div class="list-empty-icon"></div><div class="list-empty-text">没有文件</div></div>';
		$("body").append(empty);
	}

	/* 返回列表item */
	function getTemplate(item){
		var openOnNewStr = openOnNew > 0 ? ' target="_blank" ' : " ";
		if(item.type == 'doc'){
			return '<li class="doc"><a href="https://shimo.im/doc/'+ item.guid +'" title="'+ item.name +'" '+ openOnNewStr +'><i></i><span>'+ item.name +'</span></a></li>';
		}else if(item.type == 'spreadsheet'){
			return '<li class="xls"><a href="https://shimo.im/spreadsheet/'+ item.guid +'" title="'+ item.name +'" '+ openOnNewStr +'><i></i><span>'+ item.name +'</span></a></li>';
		}else if(item.type == 'folder'){
			return '<li class="folderItem"><a href="https://shimo.im/folder/'+ item.guid +'" title="'+ item.name +'" '+ openOnNewStr +'><i></i><span>'+ item.name +'</span></a></li>';
		}else{
			return '';
		}
	}
});