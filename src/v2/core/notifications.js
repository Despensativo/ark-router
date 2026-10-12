function installDashboardNotifications(){
	if(ui._arkNotificationOriginal)return;
	ui._arkNotificationOriginal=ui.addNotification;
	ui.addNotification=function(title,content,severity){
		let stack=document.getElementById('ex-toast-stack');
		if(!stack){stack=E('div',{id:'ex-toast-stack',class:'ex-toast-stack','aria-live':'polite'});document.body.appendChild(stack);}
		const body=E('div',{class:'ex-toast-body'},[]), toast=E('div',{class:'ex-toast '+(severity||'info'),role:severity==='danger'?'alert':'status'}), close=E('button',{class:'ex-toast-close',type:'button','aria-label':translateText('Fechar aviso')},['×']);
		if(title)body.appendChild(E('strong',{class:'ex-toast-title'},[title]));
		if(content instanceof Node)body.appendChild(content);else body.appendChild(document.createTextNode(String(content||'')));
		toast.appendChild(body);toast.appendChild(close);toast.appendChild(E('i',{class:'ex-toast-timer'}));stack.appendChild(toast);translateTree(toast);
		let removed=false,timer=null;const remove=function(){if(removed)return;removed=true;window.clearTimeout(timer);toast.classList.add('is-leaving');window.setTimeout(function(){toast.remove();if(stack&&!stack.children.length)stack.remove();},180);};
		close.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();remove();});
		toast.addEventListener('click',function(ev){if(!ev.target.closest('a,button,input,select,textarea'))remove();});
		toast.addEventListener('mouseenter',function(){window.clearTimeout(timer);toast.classList.add('is-paused');});
		toast.addEventListener('mouseleave',function(){toast.classList.remove('is-paused');timer=window.setTimeout(remove,3500);});
		window.requestAnimationFrame(function(){toast.classList.add('is-visible');});timer=window.setTimeout(remove,7000);return toast;
	};
}
installDashboardNotifications();
