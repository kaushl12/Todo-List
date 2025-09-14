class ApiResponse{
    constructor(statusCode,data,message="Success"){
        this.success = statusCode >= 200 && statusCode < 300;
        this.statusCode=statusCode
        this.data=data
        if (message) this.message = message;
    }
}

export {ApiResponse}