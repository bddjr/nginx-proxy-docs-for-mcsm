## Language
> [简体中文](../配置HTTPS反向代理且合并端口.md)  
> ***English***  

This document was translated by machine and manually corrected.

[<=Back to README](README.md)

***
# Configure HTTPS reverse proxy and merge Web and Daemon ports

> The merge port is usually only used if the Web panel and Daemon are on the same host.  
> This article is based on the modification of [Configure HTTPS reverse proxy](https.md)  
> If you only need HTTP reverse proxy and merge ports, please refer to [Configure HTTP reverse proxy and merge ports](http-merge-ports.md)  
> If you need to use port 443, it is recommended to refer to [Configure HTTPS reverse proxy for port 443 on the same host](443.md)  
> This article was not written by an official developer of MCSManager.  

<br />

## The principle of merging ports

MCSManager access to the beginning of the Daemon side path (does not conflict with the beginning of the web panel path):  
> /socket.io/  
> /upload/  
> /download/  

The priority of location matching in Nginx from high to low is:  
```nginx
location =/test.txt {}              # Match perfectly equal paths
location ~ (^/path/)|(^/path2/) {}  # Matching Regular Expressions
location /path/ {}                  # Matches the beginning of a single path
```

Based on these characteristics, merge the two ports to reduce the number of public network listening ports.

<br />

## Generate SSL certificate

You can generate a 90 day free certificate (with unlimited renewal) for your domain name or public IP on a free SSL website to establish a secure HTTPS connection.  
> <a href="https://zerossl.com/" target="_blank">https://zerossl.com/</a>  

### ⚠Don't leak your private key! Private key leakage can cause HTTPS to become ineffective!

<br />

## Configure reverse proxy

If the version of nginx that comes with the package manager of the operating system is too low (such as Ubuntu), please compile and install the latest version of nginx.

```nginx
# The following http blocks are the ones that need to be understood and modified, please make changes according to your needs and running environment.
# Assumptions:
#    The port that Daemon truly listens to: 24444
#    The port that the web panel truly listens to: 23333
#    Proxy port: 12333
#    SSL certificate directory: /etc/nginx/ssl/domain.com.crt
#    SSL private key directory: /etc/nginx/ssl/domain.com_ECC.key
#    You need to allow access to the primary domain domain.com and any of its subdomains

http {
    # Configure SSL certificate. The SSL ports monitored below will default to using this certificate.
    #SSL-START
    ssl_certificate "/etc/nginx/ssl/domain.com.crt";
    ssl_certificate_key "/etc/nginx/ssl/domain.com_ECC.key";

    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout  10m;
    ssl_protocols TLSv1.0 TLSv1.1 TLSv1.2 TLSv1.3; # Allow connections to be established using these encryption methods
    ssl_verify_client off; # Do not verify the client's certificate
    #SSL-END

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

        # Proxy port (multiple listens can be used to listen to multiple ports)
        listen 12333 ssl ;
        listen [::]:12333 ssl ; #IPv6

        # If the domain name used cannot match in other servers {}, it will match here.
        server_name _ ;

        # When using HTTPS access, disconnect directly without returning the certificate.
        # If you need a set of DNS CDN high defense, you should not delete this block, which is more likely to lead to certificate leakage, attackers scan the IP address directly bound to the source IP and domain name together.
        ssl_reject_handshake on;

        # When using HTTP access, disconnect.
        error_page 497 =200 /;
        location / {
            return 444;
        }
    }
    server {
        # After the Daemon proxy, the localhost accesses the HTTP protocol port (multiple listens can be used to listen to multiple ports)
        listen 127.0.0.1:12333 ;
        listen [::1]:12333 ; #IPv6

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
        # Proxy public HTTPS port (multiple listens can be used to listen to multiple ports)
        listen 12333 ssl ;
        listen [::]:12333 ssl ; #IPv6

        # The domain name you use when you visit (wildcards are supported, but wildcards cannot be used for root domain names)
        # If the link you are accessing uses a public IP address directly, enter the public IP address here.
        server_name domain.com *.domain.com ;

        # HTTP redirect to HTTPS
        error_page 497 https://$host:$server_port$request_uri;

        # Start reverse proxy
        # Proxy Daemon
        location ~ (^/socket.io/)|(^/upload/)|(^/download/) {
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
        # Proxy Web Side
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
            # Only allow clients to send cookies using HTTPS
            proxy_cookie_flags ~ secure;
            # Within 1 year after client access, HTTP will automatically redirect to HTTPS (invalid after clearing browser cache)
            add_header Strict-Transport-Security "max-age=31536000"; 
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

If the domain name is ***domain.com*** and the reverse proxy port is 12333, then the browser needs to use this address to access the panel:  
```
https://domain.com:12333/
```

**⚠Please ensure that all ports after reverse proxy pass through the server's firewall, otherwise you will not be able to access them properly.**  
⚠If using NAT ports, please ensure that the internal and external port numbers are consistent.  

<br />

## Connect to Daemon

### Local loopback address  
> In **Daemons**, enter the address as ***localhost***, port as the port number after the reverse proxy (for example, 12333), and click **Connect** or **Update** on the right.  
> **⚠You cannot fill in the address as *ws://localhost*! This causes the browser to try to connect using the HTTP protocol!**  
> 
> ![connect_default_daemon_12333.webp](../images/connect_default_daemon_12333.webp)

### Remote address  
>In **Daemons**, add ***wss://*** protocol header before the original address, enter the port number of the reverse proxy (such as 12333), and click **Connect** or **Update** on the right.  
> For example, the following two original addresses:
> > domain.com  
> > ws://domain.com  
> 
> After modification:
> > wss://domain.com  
> 
> ![connect_wss_daemon_12333.webp](../images/connect_wss_daemon_12333.webp)

<br />

***
## Thank you very much for reading the tutorial I wrote. I hope it will be helpful to you!
Have incorrect content or suggestions for improvement? Or don't understand how to configure? <a href="https://github.com/bddjr/nginx-proxy-docs-for-mcsm/issues/new" target="_blank">Click here to edit and submit the issue</a>

## Want to share this document?

[Github Repository :](https://github.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/english/https-merge-ports.md)  
```
https://github.com/bddjr/nginx-proxy-docs-for-mcsm/blob/master/english/https-merge-ports.md
```
[Github Page + Cloudflare CDN :](https://proxyformcsm.bddjr.com/english/https-merge-ports.html)  
```
https://proxyformcsm.bddjr.com/english/https-merge-ports.html
```

***
[<=Back to README](README.md)

> Source code repository: <a href="https://github.com/bddjr/nginx-proxy-docs-for-mcsm" target="_blank">nginx-proxy-docs-for-mcsm</a><br/>
> Made by <a href="https://bddjr.cn" target="_blank" rel="noopener">bddjr</a>
