// Android JNI bridge for the existing ZeroClassic daemon lifecycle.
#include "init.h"
#include "noui.h"
#include "util.h"

#include <jni.h>

#include <atomic>
#include <exception>
#include <mutex>
#include <string>
#include <thread>
#include <utility>
#include <vector>

// Implemented by bitcoind.cpp and shared with the command-line daemon.
bool AppInit(int argc, char* argv[]);
void SetupEnvironment();

namespace {
std::mutex g_lifecycle_mutex;
std::thread g_daemon_thread;
std::atomic<bool> g_running(false);
bool g_started = false;
std::string g_last_error;

void SetLastError(const std::string& error)
{
    std::lock_guard<std::mutex> lock(g_lifecycle_mutex);
    g_last_error = error;
}

void RunDaemon(std::vector<std::string> arguments)
{
    std::vector<char*> argv;
    argv.reserve(arguments.size());
    for (std::string& argument : arguments) argv.push_back(&argument[0]);

    bool success = false;
    try {
        SetupEnvironment();
        noui_connect();
        g_running.store(true);
        success = AppInit(static_cast<int>(argv.size()), argv.data());
    } catch (const std::exception& error) {
        SetLastError(error.what());
    } catch (...) {
        SetLastError("Unknown exception while running ZeroClassic daemon");
    }

    if (!success) {
        std::lock_guard<std::mutex> lock(g_lifecycle_mutex);
        if (g_last_error.empty())
            g_last_error = "ZeroClassic daemon initialization failed; see native log output";
    }
    g_running.store(false);
}

std::string GetJavaString(JNIEnv* env, jstring value)
{
    if (value == nullptr) return std::string();
    const char* chars = env->GetStringUTFChars(value, nullptr);
    if (chars == nullptr) return std::string(); // JVM has raised OutOfMemoryError.
    std::string result(chars);
    env->ReleaseStringUTFChars(value, chars);
    return result;
}
}

extern "C" JNIEXPORT jboolean JNICALL
Java_org_zeroclassic_Libzerod_nativeStart(JNIEnv* env, jclass, jobjectArray java_arguments)
{
    std::vector<std::string> arguments;
    arguments.emplace_back("libzerod");
    if (java_arguments != nullptr) {
        const jsize count = env->GetArrayLength(java_arguments);
        for (jsize i = 0; i < count; ++i) {
            auto value = static_cast<jstring>(env->GetObjectArrayElement(java_arguments, i));
            if (env->ExceptionCheck()) return JNI_FALSE;
            std::string argument = GetJavaString(env, value);
            if (value != nullptr) env->DeleteLocalRef(value);
            if (env->ExceptionCheck()) return JNI_FALSE;
            if (argument == "-daemon" || argument.compare(0, 9, "-daemon=") == 0) {
                jclass exception = env->FindClass("java/lang/IllegalArgumentException");
                if (exception != nullptr)
                    env->ThrowNew(exception,
                                  "JNI daemon must remain in the calling process; do not set -daemon");
                return JNI_FALSE;
            }
            arguments.push_back(std::move(argument));
        }
    }
    arguments.emplace_back("-daemon=0");

    std::lock_guard<std::mutex> lock(g_lifecycle_mutex);
    if (g_started || g_running.load()) return JNI_FALSE;
    if (g_daemon_thread.joinable()) g_daemon_thread.join();
    g_last_error.clear();
    g_started = true;
    try {
        g_daemon_thread = std::thread(RunDaemon, std::move(arguments));
    } catch (const std::exception& error) {
        g_started = false;
        g_last_error = error.what();
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

extern "C" JNIEXPORT void JNICALL
Java_org_zeroclassic_Libzerod_nativeStop(JNIEnv*, jclass)
{
    std::thread daemon;
    {
        std::lock_guard<std::mutex> lock(g_lifecycle_mutex);
        if (!g_daemon_thread.joinable()) return;
        StartShutdown();
        daemon = std::move(g_daemon_thread);
    }
    daemon.join();
}

extern "C" JNIEXPORT jboolean JNICALL
Java_org_zeroclassic_Libzerod_nativeIsRunning(JNIEnv*, jclass)
{
    return g_running.load() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_org_zeroclassic_Libzerod_nativeGetLastError(JNIEnv* env, jclass)
{
    std::lock_guard<std::mutex> lock(g_lifecycle_mutex);
    return env->NewStringUTF(g_last_error.c_str());
}
