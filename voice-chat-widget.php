<?php
/*
Plugin Name: Voice Chat Widget
Description: Adds a voice chat widget to your WordPress site
Version: 1.0
Author: Your Name
*/

// Enqueue necessary scripts and styles
function voice_chat_enqueue_scripts() {
    wp_enqueue_style('voice-chat-styles', plugins_url('css/voice-chat.css', __FILE__));
    wp_enqueue_script('voice-chat-script', plugins_url('js/voice-chat.js', __FILE__), array('jquery'), '1.0', true);
    
    // Pass WordPress AJAX URL to JavaScript
    wp_localize_script('voice-chat-script', 'voiceChatAjax', array(
        'webhookUrl' => 'https://n8n.digitalignyte.com/webhook/4eaebebd-6efe-4f24-ac09-c790bf88e28f'
    ));
}
add_action('wp_enqueue_scripts', 'voice_chat_enqueue_scripts');

// Add widget HTML to footer
function voice_chat_add_widget() {
    ?>
    <div id="voice-chat-widget" class="voice-chat-widget">
        <button id="voice-chat-toggle" class="voice-chat-toggle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        </button>
        
        <div id="voice-chat-popup" class="voice-chat-popup">
            <div class="voice-chat-header">
                <span>Voice Chat</span>
                <button id="voice-chat-close" class="voice-chat-close">&times;</button>
            </div>
            <div class="voice-chat-content">
                <button id="voice-chat-control" class="voice-chat-control">
                    <span class="button-text">Tap to talk</span>
                    <div class="button-animation"></div>
                </button>
            </div>
        </div>
    </div>
    <?php
}
add_action('wp_footer', 'voice_chat_add_widget');
?>