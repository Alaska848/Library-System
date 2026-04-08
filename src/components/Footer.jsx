import React from "react";
import { Link } from "react-router-dom";


function Footer() {

    return (

        <div className="bg-brown py-5 pb-2">
            <div class="container p-4">
                <div class="d-flex flex-column flex-md-row flex-md-wrap">
                    <div class="col-md-6 mb-md-3">
                        <div class="fw-bold mb-4 text-white fs-5">
                            <i className="fa-solid fa-graduation-cap text-white me-2"></i> University Library
                        </div>
                        <p class="fs-6 text-gray text-wrap fw-light mb-4">
                            Empowering academic excellence through access to world-class resources and information. Our mission is to support learning, teaching, and research.
                        </p>
                        <div className="mb-4">
                            <Link
                                to=''
                                className="text-white me-0 p-2 rounded-5 border me-3  hover-bg"
                            >
                                <i class="fa-solid fa-share-nodes "></i>
                            </Link>
                            <Link
                                to=''
                                className="text-white p-2 rounded-5 border m-1  hover-bg"
                            >
                                <i class="fa-solid fa-earth"></i>
                            </Link>
                        </div>
                    </div>
                    <div className="mb-2 col-lg-3 col-md-6 mt-md-0 mb-md-3 mt-4 pe-md-5">
                        <h5 className="text-white mb-0">Quick Links</h5>
                        <ul className="list-unstyled p-1 pb-0">
                            <li className="my-2">
                                <Link className="text-gray text-decoration-none" aria-current="page" to="/home" >Home</Link>
                            </li>
                            <li className="my-2">
                                <Link className="text-gray text-decoration-none fw-light" aria-current="page" to="/books" >Books</Link>
                                
                            </li>
                            <li className="my-2">
                                <Link className="text-gray text-decoration-none fw-light" aria-current="page" to="/about" >About</Link>
                                
                            </li>
                        </ul>
                    </div>

                    <div class="mb-2 col-lg-3 col-md-6 mt-md-0 mt-4">
                        <h5 class="text-white">Contact Us</h5>
                        <ul class="list-unstyled p-1 pb-0">
                            <li className='my-1'><span class="text-gray"><i class="text-white fa-solid fa-phone me-2"></i>+1 (555) 123-4567</span></li>
                            <li className='my-1'><span class="text-gray"><i class="text-white fa-solid fa-envelope me-2"></i>library-support@university.edu</span></li>
                            <li className='my-1'><span class="text-gray"><i class="text-white fa-solid fa-location-dot me-2"></i>123 University Ave, Scholars Plaza, 56789</span></li>
                        </ul>
                    </div>

                </div>
            </div>
            <div class="container border-top text-center">
                <div className="container d-flex justify-content-center flex-column flex-md-row">
                    <p class="text-gray fw-light fa-6 mt-4">© 2026 University Library. All rights reserved. Academic Excellence in Every Page.</p>
                </div>
            </div>
        </div>
    );
}
export default Footer;