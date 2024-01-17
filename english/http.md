## Language
> [简体中文](../配置HTTP反向代理.md)  
> ***English***  

This document was translated by machine and manually corrected.

[<=Back to README](README.md)

***
# Configure HTTPS reverse proxy

> If you only need HTTPS reverse proxy, please refer to [Configure HTTPS Reverse Proxy](https.md)  
> If you need to merge ports, please refer to [Configure HTTP Reverse Proxy and Merge Ports](http-merge-ports.md)  
> This article was not written by an official developer of MCSManager.  
> ⚠ HTTP is a plaintext transmission, not secure!  

<br />

## Configure reverse proxy

If the version of nginx that comes with the package manager of the operating system is too low (such as Ubuntu), please compile and install the latest version of nginx.

```nginx
# The following http blocks are the ones that need to be understood and modified, please make changes according to your needs and running environment.
# Assumptions:
#    The port that Daemon truly listens to: 24444
#    Port after Daemon proxy: 12444
#    The port that the web panel truly listens to: 23333
#    Port after proxy on the web panel side: 12333
#    You need to allow access to the primary domain domain.com and any of its subdomains

http {
    # Enable gzip compression by default during transmission
    gzip on;
    gzip_types text/plain text/css application/javascript application/xml application/json;
    gzip_proxied any;
    # The compression level during transmission, the higher the level, the more CPU is consumed by compression, with a maximum of 9 levels. Usually, 5 levels are sufficient
    gzip_comp_level 5;
    # Compression is required only when the transmission size reaches 1k. It is meaningless to compress small content
    gzip_min_length 1k;

    # The server in the response header returns only nginx, not the version number.
    server_tokens  off;

    # There is no limit on the file size uploaded by the client
    client_max_body_size 0;

    server {
        # This is used to prevent cross domain access.

        # Daemon access port (multiple listens can be used to listen to multiple ports)
        listen 12444 default ;
        listen [::]:12444 default ; #IPv6

        # Web panel access port (multiple listens can be used to listen to multiple ports)
        listen 12333 default ;
        listen [::]:12333 default ; #IPv6

        # If the domain name used cannot match in other servers {}, it will match here.
        server_name _ ;

        # Disconnect.
        return 444;
    }
    server {
        # After the Daemon proxy, the localhost accesses the HTTP protocol port (multiple listens can be used to listen to multiple ports)
        listen 127.0.0.1:12444 ;
        listen [::1]:12444 ; #IPv6

        # Local loopback domain name
        server_name localhost ;
        
        # The local loopback address does not take up the bandwidth, so compression is not required.
        gzip off;

        # Start reverse proxy
        # Proxy Daemon
        location / {
            # Enter the port number that the Daemon listens to
            proxy_pass http://localhost:24444 ;

            # Some request headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header REMOTE-HOST $remote_addr;
            # Necessary request headers for WebSocket
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            # Add response header
            add_header X-Cache $upstream_cache_status;
        }
    }
    server {
        # Daemon public HTTP port (multiple listens can be used to listen to multiple ports)
        listen 12444 ;
        listen [::]:12444 ; #IPv6

        # The domain name you use when you visit (wildcards are supported, but wildcards cannot be used for root domain names)
        # If the link you are accessing uses a public IP address directly, enter the public IP address here.
        server_name domain.com *.domain.com ;

        # Return robots.txt to prevent search engine indexing
        location =/robots.txt{
            default_type text/plain;
            return 200 "User-agent: *\nDisallow: /";
        }

        # Start reverse proxy
        location / {
            # Fill in the port number that the Daemon end truly listens to, and do not add a slash after it!
            proxy_pass http://localhost:24444 ;

            # Some request headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header REMOTE-HOST $remote_addr;
            # Necessary request headers for WebSocket
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            # Add response header
            add_header X-Cache $upstream_cache_status;
        }
    }
    server {
        # Web side public HTTP port (multiple listens can be used to listen to multiple ports)
        listen 12333 ;
        listen [::]:12333 ; #IPv6

        # The domain name you use when you visit (wildcards are supported, but wildcards cannot be used for root domain names)
        # If the link you are accessing uses a public IP address directly, enter the public IP address here.
        server_name domain.com *.domain.com ;

        # There is no need to return robots.txt separately; the panel already contains the file.

        # Start reverse proxy
        location / {
            # Enter the number of the port monitored by the Web panel
            proxy_pass http://localhost:23333 ;

            # Some request headers
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header REMOTE-HOST $remote_addr;
            # Necessary request headers for WebSocket
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            # Add response header
            add_header X-Cache $upstream_cache_status;
        }
    }
}
```

**After configuration is completed, reload Nginx configuration (the following command is used for Linux operating system)**
```bash
systemctl reload nginx
```

<br />

## Client access panel

According to the demonstrated configuration content, it is necessary to enable **TLSv1.2** (usually enabled by default) or **TLSv1.3** within the system.  
If the domain name is ***domain.com*** and the reverse proxy port is 12333, then the browser needs to use this address to access the panel:  
```
http://domain.com:12333/
```

**⚠Please ensure that all ports after reverse proxy pass through the server's firewall, otherwise you will not be able to access them properly.**  
⚠If using NAT ports, please ensure that the internal and external port numbers are consistent.  

<br />

## Connect to Daemon

If the Web panel background is connected to the node through the ***localhost*** domain name, then enter the address as ***localhost*** or ***ws://localhost*** in the **Daemons**, and enter the port number after the reverse proxy (for example, 12444). Then click **Connect** or **Update** on the right.
If you need to fill in the remote address ***domain.com***, then change ***localhost*** to ***domain.com***.

![connect_default_daemon_12444.webp](../images/connect_default_daemon_12444.webp)

<br />

***
## Thank you very much for reading the tutorial I wrote. I hope it will be helpful to you!
Have incorrect content or suggestions for improvement? Or don't understand how to configure? <a href="https://github.com/bddjr/nginx-proxy-docs-for-mcsm/issues/new" target="_blank">Click here to edit and submit the issue</a>

## Want to share this document?

[Github Repository :](https://github.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/english/http.md)  
```
https://github.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/english/http.md
```
[Github Page + Cloudflare CDN :](https://proxyformcsm.bddjr.com/english/http.html)  
```
https://proxyformcsm.bddjr.com/english/http.html
```

***
[<=Back to README](README.md)

> Source code repository: <a href="https://github.com/bddjr/nginx-proxy-docs-for-mcsm" target="_blank">nginx-proxy-docs-for-mcsm</a><br/>
> Made by <a href="https://bddjr.cn" target="_blank" rel="noopener">bddjr</a>
