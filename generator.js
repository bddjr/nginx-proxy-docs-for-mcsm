"use strict";

//my tools
/**@type {boolean}*/
var mydebugmode= (location.host === '127.0.0.1');
/**
 * @param {any} a
 * @return {void}
*/
function myLog(a){
    if(mydebugmode)
        console.log(a);
}

/**@type {Array<String>}*/
const StrToBool_falseStrings= ['false','null','NaN','undefined'];
/**
 * @param {String|any} inputstr
 * @return {Boolean}
*/
function StrToBool(inputstr){
    //不是字符串就直接转布尔值
    if( (typeof inputstr)!=="string" )
        return !!inputstr;
    //如果转成数后是NaN，就识别字符串是否在列表内，输出相反值
    if(Number.isNaN(+inputstr)){
        return !(
            StrToBool_falseStrings.includes(
                inputstr.trim().toLowerCase()
            )
        );
    }
    //转成数再转布尔值
    return !!(+inputstr);
}


//build Configs class
//必须写成品，否则编辑器不能给出正确的类型。
const ConfS= new class{
    /**@type {Array<String>}*/
    ConfBooleanNameList=[
        'https',
        'mergeports',
        'listenipv6'
    ];
    /**@return {Boolean}*/
    https(){
        // @ts-ignore
        return confCheck_https.checked;
    }
    /**@return {Boolean}*/
    mergeports(){
        // @ts-ignore
        return confCheck_mergeports.checked;
    }
    /**@return {Boolean}*/
    listenipv6(){
        // @ts-ignore
        return confCheck_listenipv6.checked;
    }

    /**@type {Array<String>}*/
    ConfValueNameList=[
        'webport',
        'webproxyport',
        'daemonport',
        'daemonproxyport',
        'domain',
        'sslcertpath',
        'sslkeypath'
    ];
    /**@return {String}*/
    webport(){
        // @ts-ignore
        return conf_webport_input.value;
    }
    /**@return {String}*/
    webproxyport(){
        // @ts-ignore
        return conf_webproxyport_input.value;
    }
    /**@return {String}*/
    daemonport(){
        // @ts-ignore
        return conf_daemonport_input.value;
    }
    /**@return {String}*/
    daemonproxyport(){
        // @ts-ignore
        return conf_daemonproxyport_input.value;
    }
    /**@return {String}*/
    domain(){
        // @ts-ignore
        return conf_domain_input.value;
    }
    /**@return {String}*/
    sslcertpath(){
        // @ts-ignore
        return conf_sslcertpath_input.value;
    }
    /**@return {String}*/
    sslkeypath(){
        // @ts-ignore
        return conf_sslkeypath_input.value;
    }

    /**@type {Array<String>}*/
    ConfNameList
};
ConfS.ConfNameList= ConfS.ConfBooleanNameList.concat( ConfS.ConfValueNameList );


//onclick
const clickconfCheck= new class{
    /**@return {void}*/
    https(){
        myLog('clickconfCheck.https');
        if( ConfS.https() ){
            // @ts-ignore
            conf_sslcertpath.style.display= '';
            // @ts-ignore
            conf_sslkeypath.style.display= '';
        }else{
            // @ts-ignore
            conf_sslcertpath.style.display= "none";
            // @ts-ignore
            conf_sslkeypath.style.display= "none";
        }
    }
    /**@return {void}*/
    mergeports(){
        myLog('clickconfCheck.mergeports');
        if( ConfS.mergeports() ){
            // @ts-ignore
            conf_daemonproxyport.style.display= "none";
            // @ts-ignore
            conf_webproxyport_title.innerHTML= "代理后的端口：";
        }else{
            // @ts-ignore
            conf_daemonproxyport.style.display= '';
            // @ts-ignore
            conf_webproxyport_title.innerHTML= "web端代理后的端口：";
        }
    }
    /**@return {void}*/
    listenipv6(){
        myLog('clickconfCheck.listenipv6');
    }
};

/**@return {void}*/
function generate_url(){
    myLog('generate_url');
    // @ts-ignore
    click_generate_url.innerHTML= "重新生成URL参数";

    /**@type {Array<String>}*/
    let urils= [];
    if(generate_conf_runned)
        urils.push('autogenerate=true');
    for(let i of ConfS.ConfNameList)
        urils.push(`${i}=${encodeURIComponent( ConfS[i]() )}`);
    let uri= '?'+ urils.join('&');

    myLog(uri);
    if( location.search != uri )
        history.pushState("","", uri);
}

/**@return {void}*/
function clear_url(){
    myLog('clear_url');
    if(location.search!=''){
        // @ts-ignore
        click_generate_url.innerHTML= "生成URL参数";
        history.pushState("","",
            location.href.replace( location.search, '')
        );
    }
}


//定义生成配置文件的函数
/**@type {boolean}*/
var generate_conf_runned= false;

/**@return {void}*/
function generate_conf(){
    myLog('generate_conf');
    generate_conf_runned= true;
    // @ts-ignore
    click_generate_conf.innerHTML= "重新生成配置文件";
    try{
        //验证填写信息有效
        /**
         * @param {String|Number} port
         * @param {String|Error} E
         * @return {void}
        */
        function porttest(port,E){
            if(!(
                /^[0-9]{1,5}$/.test(String(port)) && 
                (+port) >= 0 && 
                (+port) <= 65535
            )) throw E;
        }
        /**
         * @param {Document} INPUT
         * @param {String|Error} E
         * @return {void}
        */
        function sslpathtest(INPUT,E){
            if(!(
                // @ts-ignore
                ( new RegExp( INPUT.pattern ) ).test( INPUT.value )
            )) throw E;
        }

        porttest(ConfS.webport(), 'web端监听端口格式无效');
        porttest(ConfS.webproxyport(), 'web端代理后的端口格式无效');
        porttest(ConfS.daemonport(), 'daemon端监听端口格式无效');
        if(!( ConfS.mergeports() ))
            porttest(ConfS.daemonproxyport(), 'daemon端代理后的端口格式无效');

        //使用数组去重检测端口号冲突
        //有临时变量，括起来
        {
            let testportsarray=[
                ConfS.webport(),
                ConfS.webproxyport(),
                ConfS.daemonport()
            ];
            if( !(ConfS.mergeports()) )
                testportsarray.push( ConfS.daemonproxyport() );

            if( testportsarray.length > (new Set(testportsarray)).size )
                throw '端口号不能重复';
        }

        if(ConfS.https()){
            // @ts-ignore
            sslpathtest(conf_sslcertpath_input, 'SSL证书路径格式无效');
            // @ts-ignore
            sslpathtest(conf_sslkeypath_input, 'SSL私钥路径格式无效');
        }

        for(let i of ConfS.domain().split(' ')){
            let j= i.toLowerCase();
            if(j == 'localhost')
                throw '不能填写 localhost 域名';
            for( let k of ['*', '.', '-'] ){
                if( j.includes( k.repeat(2) ) )
                    throw `不能有多个 ${k} 连在一起`;
            }
        }


        //检查完毕，缓存函数与变量以备用
        //ssl目录
            /**
             * @param {String} VALUE
             * @return {String}
            */
            function correctionFilePath(VALUE){
                // @ts-ignore
                let path= VALUE.replaceAll('\\','/');
                return (
                    /^\"(.+)\"$/.test(path) 
                    ? path 
                    : `"${path}"`
                );
            }
            const buildconf_sslcertpath= correctionFilePath(ConfS.sslcertpath());
            const buildconf_sslkeypath= correctionFilePath(ConfS.sslkeypath());
        //daemon端口
            const buildconf_daemonport= (
                ConfS.mergeports()
                ? ConfS.webproxyport()
                : ConfS.daemonproxyport()
            );
        //ssl或default
            const [
                buildconf_sslORdefault, 
                buildconf_sslORnone
            ]=(
                ConfS.https()
                ? ['ssl','ssl ']
                : ['default','']
            );
        //listen
            /**
             * @param {String} ipv4
             * @param {String} ipv6
             * @param {String|Number} port
             * @return {String}
             * 如果是http，那么后面什么都不填。
             * 如果是https，那么后面填ssl。
            */
            function buildconf_listen(ipv4,ipv6,port){
                return `${
                    ConfS.listenipv6()
                    ? `        listen [${ipv6}]:${port} ${buildconf_sslORnone};\n`
                    :''
                }        listen ${ipv4+port} ${buildconf_sslORnone};`;
            }
            /**
             * @param {String} ipv4
             * @param {String} ipv6
             * @param {String|Number} port
             * @return {String}
             * 如果是http，那么后面填default。
             * 如果是https，那么后面填ssl。
            */
            function buildconf_listendefault(ipv4,ipv6,port){
                return `${
                    ConfS.listenipv6()
                    ? `        listen [${ipv6}]:${port} ${buildconf_sslORdefault} ;\n`
                    :''
                }        listen ${ipv4+port} ${buildconf_sslORdefault} ;`;
            }


        //开始进行字符串连接
        const buildconf= [];
        //ssl证书
        if (ConfS.https()){
            buildconf.push(
`    # 配置SSL证书。以下监听的ssl端口将默认使用该证书。
    #SSL-START
    ssl_certificate ${buildconf_sslcertpath};
    ssl_certificate_key ${buildconf_sslkeypath};

    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout  10m;
    ssl_protocols TLSv1.2 TLSv1.3; # 仅允许使用 TLSv1.2 或 TLSv1.3 建立连接
    ssl_verify_client off; # 不验证客户端的证书
    #SSL-END

`           );
        }
        //gzip
        buildconf.push(
`    # 传输时默认开启gzip压缩
    gzip on;
    # 传输时会被压缩的类型（应当依据文件压缩效果添加）
    gzip_types text/plain text/css application/javascript application/xml application/json;
    # 反向代理时，启用压缩
    gzip_proxied any;
    # 传输时压缩等级，等级越高压缩消耗CPU越多，最高9级，通常5级就够了
    gzip_comp_level 5;
    # 传输时大小达到1k才压缩，压缩小内容无意义
    gzip_min_length 1k;

    # 响应头中的server仅返回nginx，不返回版本号。
    server_tokens  off;

    # 不限制客户端上传文件大小
    client_max_body_size 0;

    server {
        # 这块是用于阻止跨域访问的。

`       );



        //防跨域模块
        if(ConfS.mergeports()){
            buildconf.push(
`        # 代理后端口（可用多个listen监听多个端口）
${buildconf_listendefault('','::',ConfS.webproxyport())}

`           );
        }else{
            buildconf.push(
`        # Daemon 端访问端口（可用多个listen监听多个端口）
${buildconf_listendefault('','::',ConfS.daemonproxyport())}
        # Web面板访问端口（可用多个listen监听多个端口）
${buildconf_listendefault('','::',ConfS.webproxyport())}
`           );
        }
        buildconf.push(
`        # 若使用的域名在其它server{}中都无法匹配，则会匹配这里。
        server_name _ ;

`       );
        if(ConfS.https()){
            buildconf.push(
`        # 使用https访问时，直接断开连接，不返回证书。
        # 如果你需要套DNS的CDN高防，则不应该删除此块，那样更容易导致证书泄露，攻击者扫到IP后直接将源IP与域名绑定在一起。
        ssl_reject_handshake on;

        # 使用HTTP访问时，断开连接。
        error_page 497 =200 /;
        location / {
            return 444;
        }
    }
`           );
        }else{
            buildconf.push(
`        # 断开连接。
        return 444;
    }
`           );
        }



        //localhost块
        buildconf.push(
`    server {
        # Daemon 端代理后的localhost访问HTTP协议端口（可用多个listen监听多个端口）
${(ConfS.listenipv6()) ? (`        listen [::1]:${buildconf_daemonport} ;\n`) : ''}        listen 127.0.0.1:${buildconf_daemonport} ;

        # 本地回环域名
        server_name localhost ;

        # 本地回环地址不占宽带，无需压缩。
        gzip off;

        # 开始反向代理
        location / {
            # 填写Daemon进程真正监听的端口号
            proxy_pass http://localhost:${ConfS.daemonport()} ;

            # 一些请求头
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header REMOTE-HOST $remote_addr;
            # 用于WebSocket的必要请求头
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            # 增加响应头
            add_header X-Cache $upstream_cache_status;
            # 禁止客户端缓存，防止客户端未更新内容
            expires -1;
        }
    }
`       );


        //Daemon监听公网
        if(!(ConfS.mergeports())){
            buildconf.push(
`    server {
        # Daemon 端公网端口（可用多个listen监听多个端口）
${buildconf_listen('','::',ConfS.daemonproxyport())}

        # 你访问时使用的域名（支持通配符，但通配符不能用于根域名）
        # 如果你访问时的链接直接使用公网IP，那么此处填写公网IP。
        server_name ${ConfS.domain()} ;

${ConfS.https() ?`        # 前面已经写了默认ssl配置，因此这里并没有ssl配置。您也可以在此处单独配置该域名的ssl。

        # 使用HTTP访问时，断开连接。
        error_page 497 =200 /444nginx;
        location =/444nginx {
            return 444;
        }

`:''}        # 返回 robots.txt 以防止搜索引擎收录
        location =/robots.txt{
            default_type text/plain;
            return 200 "User-agent: *\\nDisallow: /";
        }

        # 开始反向代理
        location / {
            # 填写Daemon进程真正监听的端口号
            proxy_pass http://localhost:${ConfS.daemonport()} ;

            # 一些请求头
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header REMOTE-HOST $remote_addr;
            # 用于WebSocket的必要请求头
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            # 增加响应头
            add_header X-Cache $upstream_cache_status;
            # 禁止客户端缓存，防止客户端未更新内容
            expires -1;
        }
    }
`           );
        }


        //Web监听公网
        buildconf.push(
`    server {
        # ${ConfS.mergeports() ?"代理后":"Web 端"}公网端口（可用多个listen监听多个端口）
${buildconf_listen('','::',ConfS.webproxyport())}

        # 你访问时使用的域名（支持通配符，但通配符不能用于根域名）
        # 如果你访问时的链接直接使用公网IP，那么此处填写公网IP。
        server_name domain.com *.domain.com ;

${ConfS.https() ?`        # 前面已经写了默认ssl配置，因此这里并没有ssl配置。您也可以在此处单独配置该域名的ssl。

        # 使用HTTP访问时，断开连接。
        error_page 497 =200 /444nginx;
        location =/444nginx {
            return 444;
        }

`:''}        # 此处无需单独返回 robots.txt ，面板已包含该文件。

        # 开始反向代理
${ConfS.mergeports() ?`        # 代理Daemon节点
        location ~ (^/socket.io/)|(^/upload/)|(^/download/) {
            # 填写Daemon进程真正监听的端口号，后面不能加斜杠！
            proxy_pass http://localhost:${ConfS.daemonport()} ;

            # 一些请求头
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header REMOTE-HOST $remote_addr;
            # 用于WebSocket的必要请求头
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            # 增加响应头
            add_header X-Cache $upstream_cache_status;
            # 禁止客户端缓存，防止客户端未更新内容
            expires -1;
        }
        # 代理Web端
`:''}        location / {
            # 填写Web面板端真正监听的端口号
            proxy_pass http://localhost:${ConfS.webport()} ;

            # 一些请求头
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header REMOTE-HOST $remote_addr;
            # 用于WebSocket的必要请求头
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            # 增加响应头
            add_header X-Cache $upstream_cache_status;
            # 禁止客户端缓存，防止客户端未更新内容
            expires -1;
        }
    }
`       );

        // @ts-ignore
        generate_result_text.value= buildconf.join('');
        // @ts-ignore
        generate_info.innerHTML ="配置文件生成成功 ✓";
        // @ts-ignore
        generate_info.style.color= "green";
    }catch(e){
        // @ts-ignore
        generate_info.innerHTML ="配置文件生成失败 ✖<br/>"+e;
        // @ts-ignore
        generate_info.style.color= "red";
    }
}


//read uri
if( location.search !=='' ){
    myLog('read uri');
    // @ts-ignore
    click_generate_url.innerHTML= "重新生成URL参数";

    // @ts-ignore
    let params = (new URL(document.location)).searchParams;

    for(let i of ConfS.ConfBooleanNameList){
        let j= params.get(i);
        if(j !== null){
            this['confCheck_'+i].checked= StrToBool(j);
            clickconfCheck[i]();
        }
    }

    for(let i of ConfS.ConfValueNameList){
        let j= params.get(i);
        if(j !== null){
            this[`conf_${i}_input`].value= j;
        }
    }

    //默认不自动生成配置文件，所以缩写了。
    //输入null不会导致出错。
    if(StrToBool( params.get('autogenerate') ))
        generate_conf();
}

//网页加载完成或加载终止时，自动显示内容
window.onload= /**@return {void}*/()=>{
    myLog('web loaded');

    //显示网页块
    // @ts-ignore
    mydiv.style.display= '';

    //移除加载时显示的元素块
    try{
        // @ts-ignore
        loadingtitlediv.remove();
    }catch(e){
        // @ts-ignore
        loadingtitlediv.innerHTML= '';
    }
};

/**@return {void}*/
function generate_result_text_resize(){
    let height= window.innerHeight;
    myLog(
`generate_result_text_resize
height: ${height}`
    );
    // @ts-ignore
    generate_result_text.style.height= height - 160;
}

generate_result_text_resize();
window.onresize= generate_result_text_resize;

// @ts-ignore
JSNotLoaded.innerHTML= '';
myLog('JS done');
