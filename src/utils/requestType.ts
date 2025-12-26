interface Header {
    name: string;
    value?: string;
}

// Helper to safely get a header value case-insensitively
const getHeader = (headers: Header[], name: string) =>
    headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

// Helper to check if Content-Type (in request or response) matches any of the given signatures
const hasContentType = (request: chrome.devtools.network.Request, signatures: string[]) => {
    const reqContentType = getHeader(request.request.headers || [], 'content-type');
    const resContentType = getHeader(request.response.headers || [], 'content-type');

    return signatures.some(sig =>
        reqContentType.toLowerCase().includes(sig.toLowerCase()) ||
        resContentType.toLowerCase().includes(sig.toLowerCase())
    );
};

export function isGrpcRequest(request: chrome.devtools.network.Request) {
    const grpcSignatures = ['application/grpc', 'application/x-protobuf', 'application/grpc-web'];

    if (hasContentType(request, grpcSignatures)) return true;

    // Specific gRPC checks (Accept header, grpc-encoding)
    const reqHeaders = request.request.headers || [];
    const accept = getHeader(reqHeaders, 'accept');
    const grpcEncoding = getHeader(reqHeaders, 'grpc-encoding');

    return grpcSignatures.some(sig => accept.toLowerCase().includes(sig)) || grpcEncoding !== '';
}

export function isJsonRequest(request: chrome.devtools.network.Request) {
    return hasContentType(request, ['application/json']);
}

export function isXmlRequest(request: chrome.devtools.network.Request) {
    return hasContentType(request, ['application/xml', 'text/xml']);
}

export function isFormRequest(request: chrome.devtools.network.Request) {
    return hasContentType(request, ['application/x-www-form-urlencoded']);
}
