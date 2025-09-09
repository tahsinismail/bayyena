FROM nginx:alpine
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/nginx-selfsigned.crt /etc/nginx/certs/nginx-selfsigned.crt
COPY nginx/nginx-selfsigned.key /etc/nginx/certs/nginx-selfsigned.key
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
