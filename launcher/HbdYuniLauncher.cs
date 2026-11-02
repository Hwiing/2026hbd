using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("HBD Yuni")]
[assembly: AssemblyDescription("HBD Yuni local website launcher")]
[assembly: AssemblyProduct("HBD Yuni Local Launcher")]
[assembly: AssemblyVersion("1.0.0.0")]

internal static class HbdYuniLauncher
{
    private const string Project = @"__PROJECT_DIRECTORY__";
    private const string Node = @"__NODE_EXECUTABLE__";

    [STAThread]
    private static int Main(string[] args)
    {
        bool noBrowser = Array.IndexOf(args, "--no-browser") >= 0;
        bool held = false;
        using (Mutex mutex = new Mutex(false, @"Local\HBDYuniLocalLauncher"))
        {
            try
            {
                try { held = mutex.WaitOne(TimeSpan.FromSeconds(60)); }
                catch (AbandonedMutexException) { held = true; }
                if (!held) throw new Exception("이미 실행을 준비하고 있어요. 잠시 뒤 다시 눌러주세요.");

                int firstPort = 5173;
                int portCount = 10;
                int portFlag = Array.IndexOf(args, "--port");
                if (portFlag >= 0)
                {
                    if (portFlag + 1 >= args.Length || !int.TryParse(args[portFlag + 1], out firstPort) || firstPort < 1024 || firstPort > 65535)
                        throw new Exception("올바른 로컬 포트 번호가 필요해요.");
                    portCount = 1;
                }

                int selectedPort = 0;
                bool started = false;
                for (int port = firstPort; port < firstPort + portCount && port <= 65535; port++)
                    if (IsOurServer(port)) { selectedPort = port; break; }

                if (selectedPort == 0)
                {
                    if (!Directory.Exists(Project)) throw new Exception("프로젝트 폴더를 찾지 못했어요:\n" + Project);
                    if (!File.Exists(Node)) throw new Exception("Node.js를 찾지 못했어요. Node.js 설치 후 실행파일을 다시 만들어주세요.");
                    if (!File.Exists(Path.Combine(Project, "node_modules", "vite", "bin", "vite.js")))
                        throw new Exception("birthday-lab 폴더에서 npm install을 먼저 실행해주세요.");
                    for (int port = firstPort; port < firstPort + portCount && port <= 65535; port++)
                        if (IsPortFree(port)) { selectedPort = port; break; }
                    if (selectedPort == 0) throw new Exception("사용할 수 있는 로컬 포트를 찾지 못했어요.");

                    ProcessStartInfo info = new ProcessStartInfo(Node);
                    info.Arguments = "\"" + Path.Combine(Project, "scripts", "start-local-server.mjs") + "\" " + selectedPort;
                    info.WorkingDirectory = Project;
                    info.UseShellExecute = false;
                    info.CreateNoWindow = true;
                    info.WindowStyle = ProcessWindowStyle.Hidden;
                    using (Process bootstrap = Process.Start(info))
                    {
                        if (!bootstrap.WaitForExit(10000) || bootstrap.ExitCode != 0)
                            throw new Exception("서버를 실행하지 못했어요. .local\\launcher 폴더의 로그를 확인해주세요.");
                    }
                    Stopwatch timer = Stopwatch.StartNew();
                    while (!IsOurServer(selectedPort))
                    {
                        if (timer.Elapsed > TimeSpan.FromSeconds(45))
                            throw new Exception("서버가 아직 준비되지 않았어요. birthday-lab\\.local\\launcher 폴더의 로그를 확인해주세요.");
                        Thread.Sleep(150);
                    }
                    started = true;
                }

                string url = "http://127.0.0.1:" + selectedPort + "/";
                string runtime = Path.Combine(Project, ".local", "launcher");
                Directory.CreateDirectory(runtime);
                File.WriteAllText(Path.Combine(runtime, "last-launch.json"), "{\"url\":\"" + url + "\",\"startedServer\":" + (started ? "true" : "false") + "}");
                if (!noBrowser) OpenBrowser(url);
                return 0;
            }
            catch (Exception error)
            {
                if (!noBrowser) MessageBox.Show(error.Message, "HBD Yuni", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return 1;
            }
            finally { if (held) mutex.ReleaseMutex(); }
        }
    }

    private static void OpenBrowser(string url)
    {
        string[] candidates = {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe")
        };
        string browser = Array.Find(candidates, File.Exists);
        if (browser == null) throw new Exception("음악 자동재생을 위해 Chrome 또는 Edge가 필요해요.");

        string profile = Path.Combine(Project, ".local", "browser-profile");
        Directory.CreateDirectory(profile);
        ProcessStartInfo info = new ProcessStartInfo(browser);
        info.Arguments = "--user-data-dir=\"" + profile + "\" --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --new-window \"" + url + "\"";
        info.WorkingDirectory = Project;
        info.UseShellExecute = false;
        info.WindowStyle = ProcessWindowStyle.Normal;
        Process.Start(info);
    }

    private static bool IsOurServer(int port)
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/__hbd_local.json");
            request.Proxy = null;
            request.Timeout = 650;
            request.ReadWriteTimeout = 650;
            request.AllowAutoRedirect = false;
            using (WebResponse response = request.GetResponse())
            using (StreamReader reader = new StreamReader(response.GetResponseStream()))
                return reader.ReadToEnd().Contains("\"application\":\"hbd-yuni-local\"");
        }
        catch { return false; }
    }

    private static bool IsPortFree(int port)
    {
        TcpListener listener = new TcpListener(IPAddress.Loopback, port);
        try { listener.Start(); return true; }
        catch (SocketException) { return false; }
        finally { listener.Stop(); }
    }
}
