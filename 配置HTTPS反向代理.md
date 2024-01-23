Language
> ***简体中文***  
> [English](english/https.md)  

[<=点此返回README](README.md)

***
# 配置 HTTPS 反向代理

> 若您需要合并端口，请参考 [配置HTTPS反向代理且合并端口](配置HTTPS反向代理且合并端口.md) 。  
> 若您需要使用443端口，建议参考 [为同一主机的443端口配置HTTPS反向代理](为同一主机的443端口配置HTTPS反向代理.md) 。  
> 本文**不是**MCSManager官方开发人员写的。  

<br />

## 生成SSL证书

可以在免费SSL的网站上，为自己的域名生成90天免费证书（可无限续签），用于建立安全的HTTPS连接。  
> <a href="https://www.cersign.com/free-ssl-certificate.html" target="_blank">https://www.cersign.com/free-ssl-certificate.html</a>  
> <a href="https://www.mianfeissl.com/" target="_blank">https://www.mianfeissl.com/</a>  

如果您正在使用大厂IDC（例如阿里云、腾讯云）的中国内地服务器，遇到非通用端口号（不是80也不是443）仍然不能使用域名建立HTTPS连接的情况，可以尝试直接使用公网IP建立HTTPS连接。[\[参考腾讯云用户反馈\]](https://github.com/bddjr/nginx-proxy-docs-for-mcsm/issues/12)  
可在下方网址填入公网IP，使用HTTP验证的方式获取IP证书。  
> <a href="https://zerossl.com/" target="_blank">https://zerossl.com/</a>  

### ⚠别泄露私钥！私钥泄露会导致HTTPS形同虚设！

<br />

## 配置反向代理

> <a href="https://proxyformcsm.bddjr.com/generator.html?https=1&mergeports=0" target="_blank">配置文件的主要参数改起来有些麻烦？试试这款生成器吧！</a>  

以下示范内容的测试环境：  
> ***Ubuntu 22.04*** 操作系统  
> 编译安装的Nginx ***1.24.0***  
> Web面板 ***9.9.0***  
> Daemon端 ***3.4.0***  

如果操作系统的包管理器自带的nginx版本太低（例如ubuntu），请编译安装最新版nginx。  

```nginx
# 以下http块才是需要理解并修改的内容，请依据自己的需求以及运行环境进行更改。
# 假设：
#    Daemon端真正监听的端口：24444
#    Daemon端代理后端口：12444
#    Web面板端真正监听的端口：23333
#    Web面板端代理后端口：12333
#    ssl证书目录：/etc/nginx/ssl/domain.com.crt
#    ssl证书私钥目录：/etc/nginx/ssl/domain.com_ECC.key
#    需要允许主域名 domain.com 及其所有子域名访问

http {
    # 配置SSL证书。以下监听的ssl端口将默认使用该证书。
    #SSL-START
    ssl_certificate "/etc/nginx/ssl/domain.com.crt";
    ssl_certificate_key "/etc/nginx/ssl/domain.com_ECC.key";

    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout  10m;
    ssl_protocols TLSv1.0 TLSv1.1 TLSv1.2 TLSv1.3; # 允许使用这些加密方式建立连接
    ssl_verify_client off; # 不验证客户端的证书
    #SSL-END

    # 传输时默认开启gzip压缩
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

        # Daemon 端访问端口（可用多个listen监听多个端口）
        listen 12444 ssl ;
        listen [::]:12444 ssl ; #IPv6
        # Web面板访问端口（可用多个listen监听多个端口）
        listen 12333 ssl ;
        listen [::]:12333 ssl ; #IPv6

        # 若使用的域名在其它server{}中都无法匹配，则会匹配这里。
        server_name _ ;

        # 使用https访问时，直接断开连接，不返回证书。
        # 如果你需要套DNS的CDN高防，则不应该删除此块，那样更容易导致证书泄露，攻击者扫到IP后直接将源IP与域名绑定在一起。
        ssl_reject_handshake on;

        # 使用HTTP访问时，断开连接。
        error_page 497 =200 /;
        location / {
            return 444;
        }
    }
    server {
        # Daemon 端localhost访问HTTP协议端口（可用多个listen监听多个端口）
        listen 127.0.0.1:12444 ;
        listen [::1]:12444 ; #IPv6

        # 本地回环域名
        server_name localhost ;
        
        # 本地回环地址不占宽带，无需压缩。
        gzip off;

        # 开始反向代理
        location / {
            # 填写Daemon端真正监听的端口号
            proxy_pass http://localhost:24444 ;

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
        }
    }
    server {
        # Daemon 端公网HTTPS端口（可用多个listen监听多个端口）
        listen 12444 ssl ;
        listen [::]:12444 ssl ; #IPv6

        # 你访问时使用的域名（支持通配符，但通配符不能用于根域名）
        # 如果你访问时的链接直接使用公网IP，那么此处填写公网IP。
        server_name domain.com *.domain.com ;

        # 开始反向代理
        location / {
            # 填写Daemon端真正监听的端口号
            proxy_pass http://localhost:24444 ;

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
        }
    }
    server {
        # Web 端公网HTTPS端口（可用多个listen监听多个端口）
        listen 12333 ssl ;
        listen [::]:12333 ssl ; #IPv6

        # 你访问时使用的域名（支持通配符，但通配符不能用于根域名）
        # 如果你访问时的链接直接使用公网IP，那么此处填写公网IP。
        server_name domain.com *.domain.com ;
        
        # HTTP跳转到HTTPS
        error_page 497 https://$host:$server_port$request_uri;

        # 开始反向代理
        location / {
            # 填写Web面板端真正监听的端口号
            proxy_pass http://localhost:23333 ;

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
            # 仅允许客户端使用HTTPS发送Cookie
            proxy_cookie_flags ~ secure;
            # 客户端访问后1年内HTTP自动跳转HTTPS（清浏览器缓存后失效）
            add_header Strict-Transport-Security "max-age=31536000"; 
        }
    }
}
```

**配置完成后，重载 Nginx 配置（以下命令用于Linux操作系统）**
```bash
systemctl reload nginx
```

<br />

## 客户端访问面板

假如域名是 ***domain.com*** ，反向代理后的端口是12333，那么浏览器需要使用这个地址访问面板：
```
https://domain.com:12333/
```

**⚠请确保反向代理后的端口都通过了服务器的防火墙，否则您是无法正常访问的。**  
⚠如果使用NAT端口，请确保内外端口号一致。  

<br />

## 连接Daemon端

### 本地回环地址  
> 在**节点管理**中，填写地址为 ***localhost*** ，端口填写反向代理后的端口号（例如12444），然后单击右侧的 **连接** 或 **更新** 即可。  
> **⚠不能将地址填写为 *ws://localhost* ！这会导致浏览器尝试使用HTTP协议连接！**  
> 
> ![connect_default_daemon_12444.webp](images/connect_default_daemon_12444.webp)

### 远程地址  
> 在**节点管理**中，将原有的地址前面添加 ***wss://*** 协议头，端口填写反向代理后的端口号（例如12444），然后单击右侧的 **连接** 或 **更新** 即可。  
> 例如以下两种原地址：
> > domain.com  
> > ws://domain.com  
> 
> 修改后：
> > wss://domain.com  
> 
> ![connect_wss_daemon_12444.webp](images/connect_wss_daemon_12444.webp)

<br />

***
## 非常感谢您能阅读我写的教程，希望对你有帮助！
有错误的内容或改进的建议？或者没弄懂怎么配置？[点此编辑并提交issue](../../issues/new)。  

### 想要分享该文档？  
[Gitee 仓库（中国内地访问稳定）：](https://gitee.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/%E9%85%8D%E7%BD%AEHTTPS%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86.md)  
```
https://gitee.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/%E9%85%8D%E7%BD%AEHTTPS%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86.md
```
[Github 仓库：](https://github.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/%E9%85%8D%E7%BD%AEHTTPS%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86.md)  
```
https://github.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/%E9%85%8D%E7%BD%AEHTTPS%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86.md
```
[Github Page + Cloudflare CDN 网页：](https://proxyformcsm.bddjr.com/%E9%85%8D%E7%BD%AEHTTPS%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86.html)  
```
https://proxyformcsm.bddjr.com/%E9%85%8D%E7%BD%AEHTTPS%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86.html
```

***
[<=点此返回README](README.md)

> 源码仓库：<a href="https://github.com/bddjr/nginx-proxy-docs-for-mcsm" target="_blank">nginx-proxy-docs-for-mcsm</a><br/>
> Made by <a href="https://bddjr.cn" target="_blank" rel="noopener">bddjr</a>
