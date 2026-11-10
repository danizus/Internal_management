<?php
/**
 * TAM VPS Reseller Platform — WHMCS Order & Client Sync Hook
 *
 * INSTALLATION:
 * 1. Copy this file into your WHMCS installation at:
 *    /includes/hooks/tam_order_sync.php
 * 2. Configure the two constants below: TAM_API_URL and TAM_WEBHOOK_SECRET.
 * 3. Match TAM_WEBHOOK_SECRET with WHMCS_WEBHOOK_SECRET in your TAM .env file.
 */

if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

use WHMCS\Database\Capsule;

// CONFIGURATION:
define('TAM_API_URL', 'http://localhost:4000/api/webhooks/whmcs'); // Replace with your public TAM API URL
define('TAM_WEBHOOK_SECRET', 'dev-whmcs-webhook-secret');          // Match WHMCS_WEBHOOK_SECRET in TAM .env

/**
 * Sends a signed JSON payload to the TAM API
 */
function tam_send_webhook($payload) {
    $payloadJson = json_encode($payload);
    $signature = hash_hmac('sha256', $payloadJson, TAM_WEBHOOK_SECRET);

    $ch = curl_init(TAM_API_URL);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-WHMCS-Signature: ' . $signature,
        'Content-Length: ' . strlen($payloadJson)
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    // Log to WHMCS Module Log for staff troubleshooting (Admin -> Utilities -> Logs -> Module Log)
    if (function_exists('logModuleCall')) {
        logModuleCall(
            'TAM_Sync',
            $payload['event'] ?? 'webhook',
            $payload,
            ['http_code' => $httpCode, 'response' => $response, 'error' => $curlErr]
        );
    }
}

/**
 * Hook 1: Triggered when an Order is marked Paid
 */
add_hook('OrderPaid', 1, function($vars) {
    $orderId = $vars['orderId'];

    // Fetch order line items (hosting services)
    $services = Capsule::table('tblhosting')
        ->where('orderid', $orderId)
        ->get();

    foreach ($services as $service) {
        $client = Capsule::table('tblclients')->where('id', $service->userid)->first();
        if (!$client) continue;

        $payload = [
            'event'          => 'order_paid',
            'order_id'       => $orderId,
            'service_id'     => $service->id,
            'product_id'     => $service->packageid, // Maps to whmcs_pid on display_packages
            'amount'         => (string) $service->amount,
            'currency'       => 'USD',
            'billing_cycle'  => strtolower($service->billingcycle),
            'payment_method' => $service->paymentmethod,
            'due_date'       => $service->nextduedate,
            'client'         => [
                'client_id' => $client->id,
                'name'      => trim($client->firstname . ' ' . $client->lastname),
                'email'     => $client->email,
                'phone'     => $client->phonenumber,
                'company'   => $client->companyname
            ]
        ];

        tam_send_webhook($payload);
    }
});

/**
 * Hook 2: Triggered when an Order is Accepted
 */
add_hook('AcceptOrder', 1, function($vars) {
    $orderId = $vars['orderId'];

    $services = Capsule::table('tblhosting')
        ->where('orderid', $orderId)
        ->get();

    foreach ($services as $service) {
        $client = Capsule::table('tblclients')->where('id', $service->userid)->first();
        if (!$client) continue;

        $payload = [
            'event'          => 'order_accepted',
            'order_id'       => $orderId,
            'service_id'     => $service->id,
            'product_id'     => $service->packageid,
            'amount'         => (string) $service->amount,
            'currency'       => 'USD',
            'billing_cycle'  => strtolower($service->billingcycle),
            'payment_method' => $service->paymentmethod,
            'due_date'       => $service->nextduedate,
            'client'         => [
                'client_id' => $client->id,
                'name'      => trim($client->firstname . ' ' . $client->lastname),
                'email'     => $client->email,
                'phone'     => $client->phonenumber,
                'company'   => $client->companyname
            ]
        ];

        tam_send_webhook($payload);
    }
});

/**
 * Hook 3: Triggered when Service status changes (Suspension, Termination, Cancellation)
 */
add_hook('ServiceEdit', 1, function($vars) {
    $serviceId = $vars['serviceid'];
    $service = Capsule::table('tblhosting')->where('id', $serviceId)->first();
    if (!$service) return;

    $client = Capsule::table('tblclients')->where('id', $service->userid)->first();
    if (!$client) return;

    $payload = [
        'event'      => 'service_status_change',
        'service_id' => $service->id,
        'status'     => strtolower($service->domainstatus), // Active, Suspended, Terminated, Cancelled
        'client'     => [
            'client_id' => $client->id,
            'name'      => trim($client->firstname . ' ' . $client->lastname),
            'email'     => $client->email
        ]
    ];

    tam_send_webhook($payload);
});
